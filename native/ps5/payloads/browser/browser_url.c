// Adapted from Orbit Store 1.0.1 by saawant12 (https://github.com/saawant12/orbit-store-ps5).
// SPDX-License-Identifier: GPL-3.0-or-later
// Read-only browser capture; original corresponding source is recorded in README.md.
#include "browser_match.h"
#include <ctype.h>
#include <string.h>
static int hex(unsigned char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}
// Vikingfile moved its pages to vik1ngfile.site; its download links may follow.
const char *const browser_capture_prefixes[] = {"https://vikingfile.com/d/", "https://vik1ngfile.site/d/"};
const char *browser_capture_prefix(const char *url) {
  for (size_t i = 0; i < sizeof browser_capture_prefixes / sizeof *browser_capture_prefixes; i++)
    if (!strncmp(url, browser_capture_prefixes[i], strlen(browser_capture_prefixes[i]))) return browser_capture_prefixes[i];
  return NULL;
}
// An empty filename accepts any safe one: link pages don't tell which file they lead to.
bool browser_capture_url(const char *filename, const char *url) {
  if (!filename || !url) return false;
  const char *prefix = browser_capture_prefix(url);
  if (!prefix) return false;
  const unsigned char *p = (const void *)(url + strlen(prefix));
  if (strlen((const char *)p) < 12 || p[10] != '/') return false;
  for (size_t i = 0; i < 10; i++)
    if (!((p[i] >= 'a' && p[i] <= 'z') || (p[i] >= 'A' && p[i] <= 'Z') || (p[i] >= '0' && p[i] <= '9'))) return false;
  const unsigned char *expected = (const void *)filename;
  const bool any = !*filename;
  if (any && !p[11]) return false;
  for (p += 11; *p; p++) {
    unsigned char c = *p;
    if (c == '%') {
      if (!p[1] || !p[2] || hex(p[1]) < 0 || hex(p[2]) < 0) return false;
      c = (unsigned char)(hex(p[1]) * 16 + hex(p[2])); p += 2;
    } else if (c <= 32 || c >= 127 || c == '?' || c == '#' || c == '/' || c == '\\') return false;
    if (any) {
      if (c < 32 || c == 127 || c == '/' || c == '\\') return false;
    } else if (!*expected || c != *expected++) return false;
  }
  return !*expected;
}

// Generic PS2 capture accepts only HTTPS URLs that visibly identify a ZIP, RAR or 7z file.
// The URL may put the filename in a query parameter (for example download.php?file=game.7z&id=...).
bool browser_archive_url(const char *url) {
  if (!url || strncmp(url, "https://", 8) || !url[8]) return false;
  const char *host_end = strpbrk(url + 8, "/?#");
  if (!host_end || host_end == url + 8) return false;
  for (const unsigned char *p = (const unsigned char *)url; *p; p++)
    if (*p <= 32 || *p >= 127 || *p == '\\' || *p == '"' || *p == '<' || *p == '>') return false;
  for (const char *p = host_end; *p; p++) {
    if (*p != '.') continue;
    const char *ext = p + 1;
    const char *end = ext;
    while (isalnum((unsigned char)*end)) end++;
    const bool zip = end - ext == 3 && tolower((unsigned char)ext[0]) == 'z' &&
      tolower((unsigned char)ext[1]) == 'i' && tolower((unsigned char)ext[2]) == 'p';
    const bool rar = end - ext == 3 && tolower((unsigned char)ext[0]) == 'r' &&
      tolower((unsigned char)ext[1]) == 'a' && tolower((unsigned char)ext[2]) == 'r';
    const bool seven_zip = end - ext == 2 && ext[0] == '7' && tolower((unsigned char)ext[1]) == 'z';
    if (!(zip || rar || seven_zip)) continue;
    if (!*end || *end == '?' || *end == '&' || *end == '#') return true;
  }
  return false;
}
