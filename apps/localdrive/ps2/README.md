# PS2 catalog source

`catalog.js` bundles all 3,341 game cards collected from CDRomance PS2 listing pages 1–112 on
2026-10-12. The PS2 tab displays them in a virtualized grid; the shared Search screen also searches
their names and listing metadata. The snapshot contains titles, cover image URLs, categories,
languages, regions and each game's detail page URL.

When a game is featured, focused or opened, `source.js` requests its detail page and reads game
information, description, cover and up to three screenshot image URLs. It does not read download
anchors, download forms or file URLs. The detail page URL is retained as source metadata and is not
used to start a download.

The listing snapshot is bundled, so the full catalog appears without making 112 requests on the
console. Adding newer site listings requires regenerating `catalog.js`; game detail metadata remains
loaded on demand.

On PS5, **Open and detect download** arms the native browser capture before opening the selected
game page. It forwards a visible HTTPS URL ending in `.zip`, `.rar` or `.7z` to the regular queue;
the queue extracts it to `/data/PCSX2/games`. This capture is not available in the desktop preview,
does not observe click events, and cannot identify providers that hide the archive extension.
