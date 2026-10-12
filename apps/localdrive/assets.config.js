// Copyright (C) 2026 half144 and PS5 React contributors
// SPDX-License-Identifier: GPL-3.0-or-later
// Additional attribution term: see LICENSE-ATTRIBUTION.
// Inter sizes are discovered from the bundle; JetBrains Mono only sets the update dialog's status lines. The glyphs cover the Latin, Cyrillic and symbol text of every
// locale, the catalog and the game descriptions; Chinese, Japanese, Bengali, Devanagari and Arabic come from app.json textFonts.
const glyphs = '\u00a0«®·»ÀÁÃÄÇÉÊÍÖ×ÜßàáãäçèéêíîñóôõöúûüṐͯΣЁАБВГДЕЖЗИКЛМНОПРСТУФХЧШЩЫЬЭЯабвгдежзийклмнопрстуфхцчшщыьэюяё–—’“”…\u202f™ⅢⅫ→∀□○•‘●■◆¹²°©Ûōïłńžčň‑―‐†‡▪▼✦♥χʻʼ※';

export default {fonts: {'Inter-Regular': {extraGlyphs: glyphs}, 'JetBrainsMono-Regular': {sizes: [20, 23], extraGlyphs: glyphs}}};
