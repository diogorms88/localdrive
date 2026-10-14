# SuperPSX library

The Platform menu opens SuperPSX as its own PS5 library. The library requests the selected category
page from page 1 through page 40 and caches pages for the current app session. Game cards open a
LocalDrive detail screen; each game's page is read on demand for its title, categories, description,
cover and screenshots. The detail screen keeps the source link as an explicit action.

`source.js` owns listing and game-page parsing plus the in-memory catalog. `library.js` records the
recently viewed games. `SuperPsxScreen.jsx` presents the featured game, recently viewed rail and a
virtualized page grid; `SuperPsxGamePage.jsx` presents each game's details.
