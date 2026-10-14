// Copyright (C) 2026 half144 and PS5 React contributors
// SPDX-License-Identifier: GPL-3.0-or-later
// Additional attribution term: see LICENSE-ATTRIBUTION.
#include "app_config.hpp"
#include "download_handoff.hpp"
#include "host_api.hpp"
#include "payload_loader.hpp"
#include <cstdio>
#include <cstring>
#include <string>
#include <unistd.h>

// download-daemon.elf (native/ps5/payloads/download_daemon.cpp) waits for this title to close, then
// carries its downloads on. It answers "ready" once it holds the plan, or "fail <reason>".
bool host::start_background(handoff::Plan& plan, char* error, std::size_t size) {
  plan.title_id = PS5_REACT_TITLE;
  plan.owner_uid = getuid();
  plan.owner_gid = getgid();
  std::string request, reason;
  if (handoff::encode(plan, request, reason)) {
    const int socket = payload_loader::send("download-daemon.elf", request, 10'000'000, "background downloads", reason);
    if (socket >= 0) {
      std::string answer;
      char buffer[256];
      for (int count; answer.find('\n') == std::string::npos && answer.size() < 1024 &&
                      (count = payload_loader::receive(socket, buffer, sizeof buffer)) > 0;)
        answer.append(buffer, static_cast<std::size_t>(count));
      payload_loader::close(socket);
      if (answer.starts_with("ready\n")) return true;
      const auto end = answer.find('\n');
      reason = answer.starts_with("fail ") && end != std::string::npos
                 ? "background downloads: " + answer.substr(5, end - 5)
                 : "background downloads: download-daemon.elf did not answer";
    }
  } else {
    reason = "background downloads: " + reason;
  }
  std::snprintf(error, size, "%s", reason.c_str());
  return false;
}
