// Copyright (C) 2026 half144 and PS5 React contributors
// SPDX-License-Identifier: GPL-3.0-or-later
// Additional attribution term: see LICENSE-ATTRIBUTION.
#pragma once
#include "network.hpp"
#include <cstdint>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

// The downloads an app hands to download-daemon.elf (native/ps5/payloads/download_daemon.cpp), which
// carries them on after the app closes. Text, one field per line, so the payload loader can relay it.
namespace handoff {
// What a notification names: an app's task, which may span several files (a multi-volume set).
struct Group {
  std::string title;
  // Bytes the app already finished for this task, and its whole size (0 when unknown).
  std::uint64_t done = 0, total = 0;
};
struct Entry {
  network::Request request;
  std::uint32_t group = 0;
};
struct Plan {
  std::string title_id;
  // The app's user and group: the daemon may run as another user, and hands every file it wrote
  // back to the app (-1: leave them as they are).
  long long owner_uid = -1, owner_gid = -1;
  // Where the daemon reports, rewritten in place (see download_daemon.cpp for its format).
  std::string status_path;
  // Notification texts in the app's language; "{title}" and "{percent}" are replaced. The started text,
  // shown once the daemon has taken over, may name the number of tasks as "{count}".
  std::string progress_text, complete_text, failed_text, started_text;
  // A progress page the daemon serves on 127.0.0.1:<page_port> while it runs (0: none), with its texts
  // in the app's language by key (heading, queued, connecting, downloading, verifying, retrying,
  // completed, failed, cancelled, left: "{time}" is replaced).
  std::uint16_t page_port = 0;
  std::vector<std::pair<std::string, std::string>> page_texts;
  std::vector<Group> groups;
  std::vector<Entry> entries;
};
// False with `error` when a field holds a line break or the plan is empty.
bool encode(const Plan& plan, std::string& out, std::string& error);
bool decode(std::string_view text, Plan& plan, std::string& error);
} // namespace handoff
