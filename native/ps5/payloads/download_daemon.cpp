// Copyright (C) 2026 half144 and PS5 React contributors
// SPDX-License-Identifier: GPL-3.0-or-later
// Additional attribution term: see LICENSE-ATTRIBUTION.
//
// Carries an app's downloads on after it closes, so they run while a game plays. An app's process ends
// when it closes, so the engine sends this program to the payload loader (127.0.0.1:9021), like
// relauncher.elf, and it outlives the app. It runs the engine's own download service
// (native/shared/network.cpp): the same partial files, resume checkpoints and completion receipts, so
// the app picks each file up again where this program left it.
//
// Request: a handoff plan (native/shared/download_handoff.hpp). Answers "ready" once it holds the plan,
// or "fail <reason>". Nothing after: the app closes. It starts once the app has closed, stops once the
// app runs again, and reports in the plan's status file:
//   LDS1 <waiting|running|stopped|finished> <unix seconds>
//   <file index> <state> <written> <total or -> <bytes per second> <error>
// Toasts say how far each task got, at every quarter, and how it ended.
#include "download_handoff.hpp"
#include "network.hpp"
#include <algorithm>
#include <cerrno>
#include <chrono>
#include <csignal>
#include <cstdarg>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <fcntl.h>
#include <mutex>
#include <string>
#include <sys/file.h>
#include <thread>
#include <unistd.h>
#include <vector>

extern "C" {
int sceLncUtilGetAppId(const char* title_id);
}

namespace {
// libkernel's toast request, the one the engine's host uses (native/ps5/host_platform.cpp).
struct NotifyRequest {
  char reserved[45];
  char message[3075];
};
extern "C" int sceKernelSendNotificationRequest(int device, NotifyRequest* request, std::size_t size, int blocking);

// Downloads at once, as the app runs them (state/download-queue.js MAX_PARALLEL_DOWNLOADS).
constexpr unsigned parallel = 3;
constexpr auto tick = std::chrono::milliseconds(250);
constexpr int close_timeout_s = 60, settle_ms = 500, stop_timeout_s = 20;

std::mutex log_mutex;
FILE* log_file = nullptr;

void log(const char* format, ...) {
  std::lock_guard lock(log_mutex);
  if (!log_file) return;
  std::va_list args;
  va_start(args, format);
  std::vfprintf(log_file, format, args);
  va_end(args);
  std::fputc('\n', log_file);
  std::fflush(log_file);
}

void say(const std::string& line) {
  for (std::size_t sent = 0; sent < line.size();) {
    const ssize_t count = write(STDOUT_FILENO, line.data() + sent, line.size() - sent);
    if (count <= 0) return;
    sent += static_cast<std::size_t>(count);
  }
}

// The whole request, up to its "go" line.
bool read_request(std::string& text) {
  char buffer[4096];
  while (text.size() < 16 * 1024 * 1024) {
    const ssize_t count = read(STDIN_FILENO, buffer, sizeof buffer);
    if (count <= 0) return false;
    text.append(buffer, static_cast<std::size_t>(count));
    if (text.ends_with("\ngo\n")) return true;
  }
  return false;
}

bool app_running(const std::string& title) { return sceLncUtilGetAppId(title.c_str()) >= 0; }

std::string fill(std::string text, const std::string& title, int percent) {
  for (const auto& [key, value] : {std::pair<std::string, std::string>{"{title}", title}, {"{percent}", std::to_string(percent)}})
    for (auto at = text.find(key); at != std::string::npos; at = text.find(key, at + value.size()))
      text.replace(at, key.size(), value);
  return text;
}

void notify(const std::string& message) {
  NotifyRequest request{};
  std::snprintf(request.message, sizeof request.message, "%s", message.c_str());
  const int result = sceKernelSendNotificationRequest(0, &request, sizeof request, 0);
  log("notify=0x%08x %s", static_cast<unsigned>(result), message.c_str());
}

struct File {
  std::uint32_t task = 0;
  std::string state = "queued", error;
  std::uint64_t written = 0, total = 0;
  bool total_known = false, finished = false;
  double bytes_per_second = 0;
};
struct Task {
  int quarter = 0;
  bool told = false;
};

class Daemon {
public:
  explicit Daemon(handoff::Plan plan) : plan_(std::move(plan)), files_(plan_.entries.size()), tasks_(plan_.groups.size()) {}

  void report(const char* state) {
    std::string text = "LDS1 " + std::string(state) + " " + std::to_string(static_cast<long long>(std::time(nullptr))) + "\n";
    for (std::size_t i = 0; i < files_.size(); ++i) {
      const File& f = files_[i];
      std::string error = f.error;
      std::replace(error.begin(), error.end(), '\n', ' ');
      text += std::to_string(i) + " " + f.state + " " + std::to_string(f.written) + " " +
              (f.total_known ? std::to_string(f.total) : std::string("-")) + " " +
              std::to_string(static_cast<unsigned long long>(f.bytes_per_second)) + " " + error + "\n";
    }
    const std::string temporary = plan_.status_path + ".tmp";
    const int fd = open(temporary.c_str(), O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) { log("status: open %s: %s", temporary.c_str(), std::strerror(errno)); return; }
    bool ok = true;
    for (std::size_t sent = 0; ok && sent < text.size();) {
      const ssize_t count = write(fd, text.data() + sent, text.size() - sent);
      ok = count > 0;
      if (ok) sent += static_cast<std::size_t>(count);
    }
    close(fd);
    if (!ok || rename(temporary.c_str(), plan_.status_path.c_str()) != 0)
      log("status: write %s: %s", plan_.status_path.c_str(), std::strerror(errno));
  }

  // Ends when every file finished ("finished") or the app opened again ("stopped").
  const char* run() {
    std::string error;
    if (!network::start()) {
      // The service names no reason before a task does; one enqueue reports it.
      network::enqueue(plan_.entries.front().request, error);
      for (File& f : files_) { f.state = "failed"; f.error = "network: " + error; f.finished = true; }
      log("network start failed: %s", error.c_str());
      return "stopped";
    }
    report("running");
    std::size_t next = 0;
    unsigned active = 0;
    auto last_report = std::chrono::steady_clock::now(), last_check = last_report;
    bool stopping = false;
    auto stop_deadline = last_report;
    for (;;) {
      while (!stopping && active < parallel && next < files_.size()) {
        File& f = files_[next];
        f.task = network::enqueue(plan_.entries[next].request, error);
        if (f.task) { f.state = "connecting"; ++active; }
        else { f.state = "failed"; f.error = error; f.finished = true; }
        log("file %zu %s: %s", next, plan_.entries[next].request.destination.c_str(), f.task ? "started" : error.c_str());
        ++next;
      }
      for (const auto& s : network::poll()) {
        const auto it = std::find_if(files_.begin(), files_.end(), [&](const File& f) { return f.task == s.id && !f.finished; });
        if (it == files_.end()) continue;
        it->state = s.state; it->error = s.error; it->written = s.written; it->total = s.total;
        it->total_known = s.total_known; it->bytes_per_second = s.bytes_per_second;
        if (s.state == "completed" || s.state == "failed" || s.state == "cancelled") {
          it->finished = true; it->bytes_per_second = 0; --active;
          log("file %zu %s %s", static_cast<std::size_t>(it - files_.begin()), s.state.c_str(), s.error.c_str());
        }
      }
      if (!stopping) announce();
      const auto now = std::chrono::steady_clock::now();
      if (!stopping && now - last_check >= std::chrono::seconds(1)) {
        last_check = now;
        if (app_running(plan_.title_id)) {
          // The app takes its downloads back: each stops at its last checkpoint.
          log("app opened again; handing the downloads back");
          stopping = true; stop_deadline = now + std::chrono::seconds(stop_timeout_s);
          for (const File& f : files_) if (f.task && !f.finished) network::cancel(f.task);
        }
      }
      if (now - last_report >= std::chrono::seconds(2)) { last_report = now; report("running"); }
      if (active == 0 && (stopping || next == files_.size())) break;
      if (stopping && now >= stop_deadline) { log("downloads did not stop in time"); break; }
      std::this_thread::sleep_for(tick);
    }
    network::stop();
    for (File& f : files_) {
      f.bytes_per_second = 0;
      if (!f.finished && f.state != "queued") f.state = "cancelled";
    }
    give_back();
    return stopping ? "stopped" : "finished";
  }

  // This program may run as another user than the app, and writes its files 0600: the app could not
  // open them again. Each file and its sidecars go back to the app's user.
  void give_back() const {
    if (plan_.owner_uid < 0 || plan_.owner_gid < 0) return;
    for (const auto& entry : plan_.entries)
      for (const char* suffix : {"", ".part", ".resume", ".complete"}) {
        const std::string path = entry.request.destination + suffix;
        if (chown(path.c_str(), static_cast<uid_t>(plan_.owner_uid), static_cast<gid_t>(plan_.owner_gid)) != 0 && errno != ENOENT)
          log("chown %s: %s", path.c_str(), std::strerror(errno));
      }
  }

private:
  // A toast at each quarter of a task, and once when all its files ended.
  void announce() {
    for (std::size_t g = 0; g < tasks_.size(); ++g) {
      const auto& group = plan_.groups[g];
      Task& task = tasks_[g];
      if (task.told) continue;
      std::uint64_t written = group.done, total = 0;
      bool ended = true, failed = false, sized = true;
      std::string reason;
      for (std::size_t i = 0; i < files_.size(); ++i) {
        if (plan_.entries[i].group != g) continue;
        const File& f = files_[i];
        written += f.finished && f.state == "completed" ? std::max(f.total, f.written) : f.written;
        if (f.total_known) total += f.total;
        else if (plan_.entries[i].request.expected_bytes) total += plan_.entries[i].request.expected_bytes;
        else sized = false;
        ended = ended && f.finished;
        if (f.finished && f.state != "completed") { failed = true; if (reason.empty()) reason = f.error; }
      }
      if (ended) {
        task.told = true;
        notify(fill(failed ? plan_.failed_text : plan_.complete_text, group.title, 100) + (failed && !reason.empty() ? "\n" + reason : ""));
        continue;
      }
      total = group.total ? group.total : (sized ? total + group.done : 0);
      if (!total) continue;
      const int quarter = static_cast<int>(std::min<std::uint64_t>(3, written * 4 / total));
      if (quarter > task.quarter) {
        task.quarter = quarter;
        notify(fill(plan_.progress_text, group.title, quarter * 25));
      }
    }
  }

  handoff::Plan plan_;
  std::vector<File> files_;
  std::vector<Task> tasks_;
};
} // namespace

// The engine's download service asks its platform for networking and its trust store. A payload
// shares the system's network stack, so there is nothing to bring up.
namespace network {
bool platform_start(std::string& error) {
  if (access(ca_path(), R_OK) != 0) { error = "cannot read the system certificate store"; return false; }
  return true;
}
void platform_stop() {}
const char* ca_path() { return "/system/common/cert/CA_LIST.cer"; }
void platform_log(const char* line) { log("%s", line); }
} // namespace network

int main() {
  // The app's end of the connection goes away with it.
  std::signal(SIGPIPE, SIG_IGN);
  std::string text, error;
  handoff::Plan plan;
  if (!read_request(text)) return 1;
  if (!handoff::decode(text, plan, error)) { say("fail " + error + "\n"); return 1; }
  text.clear();
  text.shrink_to_fit();

  // One daemon at a time: a second one would write the same partial files.
  const int lock = open((plan.status_path + ".lock").c_str(), O_RDWR | O_CREAT, 0644);
  if (lock < 0 || flock(lock, LOCK_EX | LOCK_NB) != 0) {
    say("fail background downloads from an earlier handoff are still running\n");
    return 1;
  }
  log_file = std::fopen((plan.status_path + ".log").c_str(), "w");
  log("download-daemon: %zu files for %s", plan.entries.size(), plan.title_id.c_str());
  const std::string title = plan.title_id;
  Daemon daemon(std::move(plan));
  daemon.report("waiting");
  say("ready\n");

  // The app still owns its files until it has closed.
  int waited_ms = 0;
  for (; app_running(title); waited_ms += 100) {
    if (waited_ms >= close_timeout_s * 1000) {
      log("the app did not close; nothing downloaded");
      daemon.report("stopped");
      return 1;
    }
    usleep(100 * 1000);
  }
  usleep(settle_ms * 1000);
  log("app closed after %d ms", waited_ms);
  const char* outcome = daemon.run();
  daemon.report(outcome);
  log("download-daemon: %s", outcome);
  return 0;
}
