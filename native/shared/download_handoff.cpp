// Copyright (C) 2026 half144 and PS5 React contributors
// SPDX-License-Identifier: GPL-3.0-or-later
// Additional attribution term: see LICENSE-ATTRIBUTION.
#include "download_handoff.hpp"
#include <charconv>

// "LDH1", the plan's fields, each group, then each file from "file <group>" to "end", then "go".
namespace handoff {
namespace {
constexpr std::size_t max_entries = 256, max_groups = 64;

bool one_line(const std::string& value) { return value.find_first_of("\r\n") == std::string::npos; }

struct Writer {
  std::string& out;
  bool ok = true;
  void line(std::string_view key, const std::string& value) {
    ok = ok && one_line(value);
    out.append(key).append(" ").append(value).append("\n");
  }
  void number(std::string_view key, std::uint64_t value) { line(key, std::to_string(value)); }
};

bool number(std::string_view text, std::uint64_t& value) {
  const auto result = std::from_chars(text.data(), text.data() + text.size(), value);
  return !text.empty() && result.ec == std::errc{} && result.ptr == text.data() + text.size();
}

// Splits "a b rest" into its first word and the rest.
std::string_view word(std::string_view& text) {
  const auto space = text.find(' ');
  const auto first = text.substr(0, space);
  text = space == std::string_view::npos ? std::string_view{} : text.substr(space + 1);
  return first;
}
} // namespace

bool encode(const Plan& plan, std::string& out, std::string& error) {
  if (plan.entries.empty() || plan.entries.size() > max_entries || plan.groups.empty() || plan.groups.size() > max_groups) {
    error = "between 1 and 256 files in 1 to 64 tasks"; return false;
  }
  out = "LDH1\n";
  Writer w{out};
  w.line("title-id", plan.title_id);
  w.line("status", plan.status_path);
  if (plan.owner_uid >= 0 && plan.owner_gid >= 0)
    w.line("owner", std::to_string(plan.owner_uid) + " " + std::to_string(plan.owner_gid));
  w.line("progress-text", plan.progress_text);
  w.line("complete-text", plan.complete_text);
  w.line("failed-text", plan.failed_text);
  for (const auto& group : plan.groups) {
    w.line("group", std::to_string(group.done) + " " + std::to_string(group.total) + " " + group.title);
  }
  for (const auto& entry : plan.entries) {
    const auto& r = entry.request;
    if (entry.group >= plan.groups.size()) { error = "a file names a task that does not exist"; return false; }
    w.number("file", entry.group);
    w.line("url", r.url);
    w.line("destination", r.destination);
    if (!r.storage_root.empty()) w.line("storage-root", r.storage_root);
    if (r.expected_bytes) w.number("expected", r.expected_bytes);
    if (!r.sha256.empty()) w.line("sha256", r.sha256);
    w.number("connections", r.connections);
    w.number("range", r.range_bytes);
    w.line("flags", std::string{r.resume ? '1' : '0', r.adaptive ? '1' : '0', r.recover_completed ? '1' : '0',
                                r.reject_html ? '1' : '0'});
    for (const auto& header : r.headers) w.line("header", header);
    for (const auto& mirror : r.mirrors) w.line("mirror", mirror);
    for (const auto& piece : r.pieces)
      w.line("piece", std::to_string(piece.offset) + " " + std::to_string(piece.size) + " " +
                          (piece.sha1.empty() ? std::string("-") : piece.sha1) + " " + piece.url);
    out.append("end\n");
  }
  out.append("go\n");
  if (!w.ok) { error = "a title, path or link holds a line break"; return false; }
  return true;
}

bool decode(std::string_view text, Plan& plan, std::string& error) {
  plan = {};
  Entry* entry = nullptr;
  bool started = false, finished = false;
  while (!text.empty() && !finished) {
    const auto end = text.find('\n');
    if (end == std::string_view::npos) { error = "the request ends mid-line"; return false; }
    std::string_view line = text.substr(0, end);
    text.remove_prefix(end + 1);
    if (!started) {
      if (line != "LDH1") { error = "not a download handoff"; return false; }
      started = true; continue;
    }
    const auto key = word(line);
    const std::string value(line);
    std::uint64_t n = 0;
    bool ok = true;
    if (entry) {
      auto& r = entry->request;
      if (key == "end") entry = nullptr;
      else if (key == "url") r.url = value;
      else if (key == "destination") r.destination = value;
      else if (key == "storage-root") r.storage_root = value;
      else if (key == "expected") ok = number(line, r.expected_bytes);
      else if (key == "sha256") r.sha256 = value;
      else if (key == "connections") { ok = number(line, n) && n >= 1 && n <= 64; r.connections = static_cast<unsigned>(n); }
      else if (key == "range") ok = number(line, r.range_bytes) && r.range_bytes >= 1024 * 1024 && r.range_bytes <= 256 * 1024 * 1024;
      else if (key == "flags") {
        ok = line.size() == 4 && line.find_first_not_of("01") == std::string_view::npos;
        if (ok) { r.resume = line[0] == '1'; r.adaptive = line[1] == '1'; r.recover_completed = line[2] == '1'; r.reject_html = line[3] == '1'; }
      }
      else if (key == "header") { ok = r.headers.size() < 32; if (ok) r.headers.push_back(value); }
      else if (key == "mirror") { ok = r.mirrors.size() < 4; if (ok) r.mirrors.push_back(value); }
      else if (key == "piece") {
        network::Piece piece;
        const auto offset = word(line), size = word(line), sha1 = word(line);
        piece.sha1 = sha1 == "-" ? std::string() : std::string(sha1);
        piece.url = std::string(line);
        ok = number(offset, piece.offset) && number(size, piece.size) && !piece.url.empty() && r.pieces.size() < 1024;
        if (ok) r.pieces.push_back(std::move(piece));
      } else ok = false;
    } else if (key == "file") {
      ok = number(line, n) && n < plan.groups.size() && plan.entries.size() < max_entries;
      if (ok) { plan.entries.emplace_back(); entry = &plan.entries.back(); entry->group = static_cast<std::uint32_t>(n); }
    } else if (key == "group") {
      Group group;
      ok = number(word(line), group.done) && number(word(line), group.total) && plan.groups.size() < max_groups;
      group.title = std::string(line);
      if (ok) plan.groups.push_back(std::move(group));
    }
    else if (key == "title-id") plan.title_id = value;
    else if (key == "status") plan.status_path = value;
    else if (key == "owner") {
      ok = number(word(line), n);
      plan.owner_uid = static_cast<long long>(n);
      ok = ok && number(line, n);
      plan.owner_gid = static_cast<long long>(n);
    }
    else if (key == "progress-text") plan.progress_text = value;
    else if (key == "complete-text") plan.complete_text = value;
    else if (key == "failed-text") plan.failed_text = value;
    else if (key == "go") finished = true;
    else ok = false;
    if (!ok) { error = "unreadable line: " + std::string(key); return false; }
  }
  if (!finished || entry) { error = "the request is incomplete"; return false; }
  if (plan.entries.empty() || plan.title_id.empty() || plan.status_path.empty()) { error = "the request names no files"; return false; }
  for (const auto& e : plan.entries)
    if (e.request.url.empty() || e.request.destination.empty()) { error = "a file has no link or destination"; return false; }
  return true;
}
} // namespace handoff
