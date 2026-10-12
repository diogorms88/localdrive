// Adapted from Orbit Store 1.0.1 by saawant12 (https://github.com/saawant12/orbit-store-ps5).
// SPDX-License-Identifier: GPL-3.0-or-later
// Read-only browser capture; original corresponding source is recorded in README.md.
#include "browser_match.h"
#include <string.h>
#include <strings.h>
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

static bool archive_name(const char *value, size_t length) {
  for (size_t i = 0; i < length; i++) {
    const size_t left = length - i;
    if ((left == 4 && !strncasecmp(value + i, ".zip", 4)) ||
        (left == 4 && !strncasecmp(value + i, ".rar", 4)) ||
        (left == 3 && !strncasecmp(value + i, ".7z", 3))) return true;
  }
  return false;
}

// PS2 capture is limited to CDRomance's actual file endpoint so the game page
// or a text fragment containing an archive name cannot be mistaken for the link.
static bool cdromance_download(const char *url, const char *host_end) {
  const char *host = url + 8;
  const size_t host_length = (size_t)(host_end - host);
  static const char suffix[] = ".cdromance.org";
  if (host_length <= sizeof suffix - 1 || strncmp(host, "dl", 2) ||
      strncasecmp(host + host_length - (sizeof suffix - 1), suffix, sizeof suffix - 1)) return false;
  if (strncmp(host_end, "/download.php?", 14)) return false;
  const char *query = host_end + 14;
  while (*query && *query != '#') {
    const char *end = query;
    while (*end && *end != '&' && *end != '#') end++;
    if ((size_t)(end - query) > 5 && !strncmp(query, "file=", 5) &&
        archive_name(query + 5, (size_t)(end - query - 5))) return true;
    query = *end == '&' ? end + 1 : end;
  }
  return false;
}

bool browser_archive_url(const char *url) {
  if (!url || strncmp(url, "https://", 8) || !url[8]) return false;
  const char *host_end = strpbrk(url + 8, "/?#");
  if (!host_end || host_end == url + 8) return false;
  for (const unsigned char *p = (const unsigned char *)url; *p; p++)
    if (*p <= 32 || *p >= 127 || *p == '\\' || *p == '"' || *p == '<' || *p == '>') return false;
  return cdromance_download(url, host_end);
}

// CDRomance's "Show Links" response is HTML, so the copy in browser memory may separate
// query parameters with `&amp;`, `&#38;` or `&#038;`. The server answers those with HTTP 400.
void browser_unescape_ampersands(char *url) {
  static const char *const entities[] = {"&amp;", "&#038;", "&#38;"};
  char *out = url;
  for (const char *in = url; *in;) {
    size_t skip = 0;
    for (size_t i = 0; i < sizeof entities / sizeof *entities && !skip; i++)
      if (!strncasecmp(in, entities[i], strlen(entities[i]))) skip = strlen(entities[i]);
    *out++ = *in;
    in += skip ? skip : 1;
  }
  *out = 0;
}
