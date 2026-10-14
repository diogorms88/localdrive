// Copyright (C) 2026 half144 and PS5 React contributors
// SPDX-License-Identifier: GPL-3.0-or-later
// Additional attribution term: see LICENSE-ATTRIBUTION.
// download-daemon.elf builds the engine's download service (native/shared/network.cpp) outside an app,
// so it has no generated app configuration; networking is the one setting that service reads.
#pragma once
#define PS5_REACT_NETWORKING 1
