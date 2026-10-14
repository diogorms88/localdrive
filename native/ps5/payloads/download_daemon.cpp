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
// Toasts say that it took over, how far each task got at every quarter, and how it ended.
#include "download_handoff.hpp"
#include "network.hpp"
#include <algorithm>
#include <arpa/inet.h>
#include <atomic>
#include <cerrno>
#include <chrono>
#include <csignal>
#include <cstdarg>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <fcntl.h>
#include <iterator>
#include <mutex>
#include <netinet/in.h>
#include <initializer_list>
#include <string>
#include <string_view>
#include <sys/file.h>
#include <sys/select.h>
#include <sys/socket.h>
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
// A file that fails is tried again this many times in all, this long apart: a host that allows one
// connection per IP (CDRomance) can still count the app's connection right after the app closed.
constexpr unsigned max_attempts = 3;
constexpr auto retry_delay = std::chrono::seconds(20);

// Failures another attempt cannot fix: the files on disk or the drive are the problem.
bool retriable(const std::string& error) {
  for (const char* lasting : {"partial file", "checkpoint", "space", "exists", "expectedBytes", "changed", "storage"})
    if (error.find(lasting) != std::string::npos) return false;
  return true;
}

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

std::string fill(std::string text, std::initializer_list<std::pair<std::string_view, std::string>> values) {
  for (const auto& [key, value] : values)
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
  unsigned attempts = 0;
  std::chrono::steady_clock::time_point retry_at{};
};
struct Task {
  int quarter = 0;
  bool told = false;
};
// A task's files summed up: what its toasts and its row on the progress page say.
struct Measure {
  std::uint64_t written = 0, total = 0;
  double bytes_per_second = 0;
  bool ended = true, failed = false;
  std::string reason, state;
};

std::string escape(const std::string& text) {
  std::string out;
  for (const char c : text) {
    switch (c) {
      case '&': out += "&amp;"; break;
      case '<': out += "&lt;"; break;
      case '>': out += "&gt;"; break;
      case '"': out += "&quot;"; break;
      default: out += c;
    }
  }
  return out;
}

std::string format_speed(double bytes_per_second) {
  char text[32];
  std::snprintf(text, sizeof text, "%.1f MB/s", bytes_per_second / (1024 * 1024));
  return text;
}

std::string format_time(std::uint64_t seconds) {
  char text[32];
  if (seconds >= 3600) std::snprintf(text, sizeof text, "%lluh %02llum", static_cast<unsigned long long>(seconds / 3600),
                                     static_cast<unsigned long long>(seconds % 3600 / 60));
  else if (seconds >= 60) std::snprintf(text, sizeof text, "%llu min", static_cast<unsigned long long>(seconds / 60));
  else std::snprintf(text, sizeof text, "%llu s", static_cast<unsigned long long>(seconds));
  return text;
}

// The progress page on 127.0.0.1, for the home-screen shortcut whose system web view opens over a
// game. Serves the latest page to every request; one connection at a time, each bounded in time.
class PageServer {
public:
  bool start(std::uint16_t port) {
    listener_ = socket(AF_INET, SOCK_STREAM, 0);
    if (listener_ < 0) { log("page: socket: %s", std::strerror(errno)); return false; }
    const int enabled = 1;
    setsockopt(listener_, SOL_SOCKET, SO_REUSEADDR, &enabled, sizeof enabled);
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_port = htons(port);
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    if (bind(listener_, reinterpret_cast<sockaddr*>(&address), sizeof address) != 0 || listen(listener_, 4) != 0) {
      log("page: port %u: %s", static_cast<unsigned>(port), std::strerror(errno));
      close(listener_); listener_ = -1;
      return false;
    }
    thread_ = std::thread([this] { serve(); });
    log("page: http://127.0.0.1:%u/", static_cast<unsigned>(port));
    return true;
  }
  void stop() {
    running_ = false;
    if (thread_.joinable()) thread_.join();
    if (listener_ >= 0) close(listener_);
    listener_ = -1;
  }
  void publish(std::string page) {
    std::lock_guard lock(mutex_);
    page_ = std::move(page);
  }

private:
  void serve() {
    while (running_) {
      fd_set ready;
      FD_ZERO(&ready);
      FD_SET(listener_, &ready);
      timeval wait{0, 500 * 1000};
      if (select(listener_ + 1, &ready, nullptr, nullptr, &wait) <= 0) continue;
      const int client = accept(listener_, nullptr, nullptr);
      if (client < 0) continue;
      const timeval timeout{2, 0};
      setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof timeout);
      setsockopt(client, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof timeout);
      std::string request;
      char buffer[1024];
      for (ssize_t count; request.find("\r\n\r\n") == std::string::npos && request.size() < 8192 &&
                          (count = recv(client, buffer, sizeof buffer, 0)) > 0;)
        request.append(buffer, static_cast<std::size_t>(count));
      std::string body;
      { std::lock_guard lock(mutex_); body = page_; }
      const bool page = request.starts_with("GET / ") || request.starts_with("GET /?");
      std::string response = page ? "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n"
                                  : "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n";
      if (!page) body = "not found";
      response += "Cache-Control: no-store\r\nConnection: close\r\nContent-Length: " + std::to_string(body.size()) + "\r\n\r\n" + body;
      for (std::size_t sent = 0; sent < response.size();) {
        const ssize_t count = send(client, response.data() + sent, response.size() - sent, 0);
        if (count <= 0) break;
        sent += static_cast<std::size_t>(count);
      }
      close(client);
    }
  }

  int listener_ = -1;
  std::atomic<bool> running_{true};
  std::thread thread_;
  std::mutex mutex_;
  std::string page_;
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
    const bool page = plan_.page_port && server_.start(plan_.page_port);
    if (page) server_.publish(render(false));
    // The app closed before it could show anything: this says the handoff worked.
    if (!plan_.started_text.empty()) notify(fill(plan_.started_text, {{"{count}", std::to_string(plan_.groups.size())}}));
    unsigned active = 0;
    auto last_report = std::chrono::steady_clock::now(), last_check = last_report;
    bool stopping = false;
    auto stop_deadline = last_report;
    for (;;) {
      auto now = std::chrono::steady_clock::now();
      // In order; a file waiting to be tried again does not hold back the ones after it.
      for (std::size_t i = 0; !stopping && active < parallel && i < files_.size(); ++i) {
        File& f = files_[i];
        if (f.finished || f.task || now < f.retry_at) continue;
        ++f.attempts;
        f.task = network::enqueue(plan_.entries[i].request, error);
        if (f.task) { f.state = "connecting"; ++active; }
        else { f.state = "failed"; f.error = error; f.finished = true; }
        log("file %zu %s: %s (attempt %u)", i, plan_.entries[i].request.destination.c_str(), f.task ? "started" : error.c_str(), f.attempts);
      }
      for (const auto& s : network::poll()) {
        const auto it = std::find_if(files_.begin(), files_.end(), [&](const File& f) { return f.task && f.task == s.id && !f.finished; });
        if (it == files_.end()) continue;
        it->state = s.state; it->error = s.error; it->written = s.written; it->total = s.total;
        it->total_known = s.total_known; it->bytes_per_second = s.bytes_per_second;
        if (s.state == "completed" || s.state == "failed" || s.state == "cancelled") {
          const auto index = static_cast<std::size_t>(it - files_.begin());
          log("file %zu %s %s", index, s.state.c_str(), s.error.c_str());
          it->bytes_per_second = 0; it->task = 0; --active;
          if (s.state == "failed" && !stopping && it->attempts < max_attempts && retriable(s.error)) {
            it->state = "retrying"; it->retry_at = now + retry_delay;
            log("file %zu: trying again in %lld s", index, static_cast<long long>(retry_delay.count()));
          } else it->finished = true;
        }
      }
      if (!stopping) announce();
      if (page) server_.publish(render(stopping));
      now = std::chrono::steady_clock::now();
      if (!stopping && now - last_check >= std::chrono::seconds(1)) {
        last_check = now;
        if (app_running(plan_.title_id)) {
          // The app takes its downloads back: each stops at its last checkpoint.
          log("app opened again; handing the downloads back");
          stopping = true; stop_deadline = now + std::chrono::seconds(stop_timeout_s);
          for (const File& f : files_) if (f.task) network::cancel(f.task);
        }
      }
      if (now - last_report >= std::chrono::seconds(2)) { last_report = now; report("running"); }
      if (active == 0 && (stopping || std::all_of(files_.begin(), files_.end(), [](const File& f) { return f.finished; }))) break;
      if (stopping && now >= stop_deadline) { log("downloads did not stop in time"); break; }
      std::this_thread::sleep_for(tick);
    }
    network::stop();
    for (File& f : files_) {
      f.bytes_per_second = 0;
      if (!f.finished && f.state != "queued") f.state = "cancelled";
    }
    if (page) server_.stop();
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
  Measure measure(std::size_t g) const {
    const auto& group = plan_.groups[g];
    Measure m;
    m.written = group.done;
    std::uint64_t total = 0;
    bool sized = true;
    // The state the task shows: the furthest along of its files still at work.
    static constexpr const char* order[] = {"downloading", "verifying", "connecting", "retrying", "queued"};
    std::size_t rank = std::size(order);
    for (std::size_t i = 0; i < files_.size(); ++i) {
      if (plan_.entries[i].group != g) continue;
      const File& f = files_[i];
      m.written += f.finished && f.state == "completed" ? std::max(f.total, f.written) : f.written;
      if (f.total_known) total += f.total;
      else if (plan_.entries[i].request.expected_bytes) total += plan_.entries[i].request.expected_bytes;
      else sized = false;
      m.bytes_per_second += f.bytes_per_second;
      m.ended = m.ended && f.finished;
      if (f.finished && f.state != "completed") { m.failed = true; if (m.reason.empty()) m.reason = f.error; }
      for (std::size_t r = 0; r < rank; ++r) if (f.state == order[r]) rank = r;
    }
    m.total = group.total ? group.total : (sized ? total + group.done : 0);
    m.state = m.ended ? (m.failed ? "failed" : "completed") : rank < std::size(order) ? order[rank] : "cancelled";
    return m;
  }

  // A toast at each quarter of a task, and once when all its files ended.
  void announce() {
    for (std::size_t g = 0; g < tasks_.size(); ++g) {
      const auto& group = plan_.groups[g];
      Task& task = tasks_[g];
      if (task.told) continue;
      const Measure m = measure(g);
      if (m.ended) {
        task.told = true;
        notify(fill(m.failed ? plan_.failed_text : plan_.complete_text, {{"{title}", group.title}}) +
               (m.failed && !m.reason.empty() ? "\n" + m.reason : ""));
        continue;
      }
      if (!m.total) continue;
      const int quarter = static_cast<int>(std::min<std::uint64_t>(3, m.written * 4 / m.total));
      if (quarter > task.quarter) {
        task.quarter = quarter;
        notify(fill(plan_.progress_text, {{"{title}", group.title}, {"{percent}", std::to_string(quarter * 25)}}));
      }
    }
  }

  std::string text(const char* key, const char* fallback) const {
    for (const auto& [name, value] : plan_.page_texts) if (name == key) return value;
    return fallback;
  }

  // The progress page: every task with its share done, state, speed and time left. It reloads itself.
  std::string render(bool stopping) const {
    const std::string heading = escape(text("heading", "LocalDrive downloads"));
    std::string html =
      "<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"2\">"
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>" + heading + "</title><style>"
      "body{margin:0;padding:48px 64px;background:#0d0d0f;color:#f2f2f3;font-family:sans-serif}"
      "h1{font-size:40px;font-weight:600;margin:0 0 36px}"
      ".task{background:#17171a;border-radius:16px;padding:24px 28px;margin-bottom:20px}"
      ".row{display:flex;justify-content:space-between;gap:24px;font-size:28px}"
      ".title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
      ".bar{height:12px;background:#2a2a2f;border-radius:6px;margin:16px 0 12px;overflow:hidden}"
      ".fill{height:100%;background:#f2f2f3;border-radius:6px}.failed .fill{background:#e5484d}"
      ".detail{font-size:22px;color:#a3a3ab}</style></head><body><h1>" + heading + "</h1>";
    for (std::size_t g = 0; g < plan_.groups.size(); ++g) {
      const Measure m = measure(g);
      const int percent = m.state == "completed" ? 100 : m.total ? static_cast<int>(std::min<std::uint64_t>(100, m.written * 100 / m.total)) : 0;
      const std::string state = stopping && !m.ended ? "cancelled" : m.state;
      std::string detail = escape(text(state.c_str(), state.c_str()));
      if (state == "downloading" && m.bytes_per_second > 0) {
        detail += " &middot; " + format_speed(m.bytes_per_second);
        if (m.total > m.written)
          detail += " &middot; " + escape(fill(text("left", "{time} left"), {{"{time}", format_time(static_cast<std::uint64_t>((m.total - m.written) / m.bytes_per_second))}}));
      }
      if (m.failed && !m.reason.empty()) detail += " &middot; " + escape(m.reason);
      html += "<div class=\"task" + std::string(m.failed ? " failed" : "") + "\"><div class=\"row\"><span class=\"title\">" +
              escape(plan_.groups[g].title) + "</span><span>" + (m.total || m.ended ? std::to_string(percent) + "%" : "") +
              "</span></div><div class=\"bar\"><div class=\"fill\" style=\"width:" + std::to_string(percent) +
              "%\"></div></div><div class=\"detail\">" + detail + "</div></div>";
    }
    return html + "</body></html>";
  }

  handoff::Plan plan_;
  std::vector<File> files_;
  std::vector<Task> tasks_;
  PageServer server_;
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
