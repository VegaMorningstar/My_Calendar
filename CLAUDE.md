# Project notes: My Calendar

A photo calendar built around one reusable element, `src/photo-calendar/`. See `README.md` for what it does and how to run it.

## Conventions

- No em dashes anywhere in the repo (code, comments, docs). Use a comma, colon, parentheses or a plain hyphen.
- Comment the code: a header on every file saying what it is for, and a short doc comment on each exported function, hook and component.
- Keep the calendar modular and exportable: everything it needs lives inside `src/photo-calendar/`, and other code imports it only through `src/photo-calendar/index.js`.
- All Write-With-Nature glass code stays inside `src/photo-calendar/wwn-glass/`, imported only through its `index.js`.
- Keep the typegpu packages pinned exactly: `typegpu` 0.12.4, `@typegpu/sdf` and `@typegpu/noise` 0.12.0, `unplugin-typegpu` 0.12.3 (the versions Write-With-Nature uses). `typegpu` 0.12.6 renders the glass panel black, and `unplugin-typegpu` 0.12.4 demands 0.12.6, which breaks `npm ci`.
- PWA and hosting: the app builds with relative URLs (`base: './'`) so it works on a GitHub Pages project path. `public/sw.js` has placeholders that `vite.config.js` fills at build time; do not hard-code asset names in it.
- Layout responds to the calendar's own width (container queries in `src/photo-calendar/styles/`), not the viewport. The day view is the exception: it is a portal, so it uses viewport media queries.
- Imported photos live only in IndexedDB on the device (`src/photo-library/`). Never add code that uploads them. Dates come from the EXIF string as written (no timezone conversion); keep `reviveValues: false` and do not combine it with `pick` (exifr 7.1.3 throws).
- Wallpaper: the frosted default (`default-wallpaper.js`) and any photo the user picks go through one path. The page shows it (`.app-wallpaper`), `setBackgroundImage` hands it to the glass, and the glass draws it through the `wwn-glass/stars.js` stand-in (WWN's backdrop painter calls `drawStars` after filling the paper). Do not edit the copied WWN files to add it.
- Text colours: use `usePageInk(ref)` with a ref to the element the text sits in (and, for text in one corner of a box, its `region` argument), so the ink follows the brightness directly behind that spot. It picks firmly light or dark, never a blended grey. Do not hard-code text colours over glass or photos, and do not add glow or blur halos to text: the look is a hairline engraved highlight only.
- The gear and its menu use WWN glass through the calendar's glass kit (`photo-calendar/index.js`): `GlassButtons` for the gear, `LiquidGlassPanel` for the menu. Match that physics for any new glass element, and do not build look-alikes in CSS.
- Glass panels: give every `LiquidGlassPanel` its params from `usePanelEdge(ref)` and set the panel's `border-radius` to `calc(var(--pc-panel-r) - var(--pc-edge, 0px))`. WWN sizes the rim as a fraction of height (thick on tall panels, overlapping content) and adds the rim to the corner radius; the hook fixes the rim in pixels, inside the padding, and publishes `--pc-edge` to compensate the corners.
- Fast start: the wallpaper is painted before the app loads (script in `index.html`, using the hint that `src/photo-library/wallpaper.js` keeps in localStorage under `mycal.wallpaper`). When changing wallpaper code, keep `readWallpaperHint`, the early script and `useWallpaper` in step, and never make the first render wait for IndexedDB. The default wallpaper and its `default-wallpaper-meta.json` come from `npm run default-wallpaper`; the fonts are hosted in `public/fonts` (`src/fonts.css`), not loaded from Google.
- Page scrolling: the document never scrolls (`html`, `body` and `#root` are exactly the screen, `body` is fixed); `.stage` is the only scroll container and scrolls only when the content is genuinely taller than the screen. Keep every row of the layout within the screen width, in particular the gear, info button and note row (the note's width is `--lib-note-w`), or a phone gets sideways scroll. Scroll listeners must use capture, because `.stage` scroll events do not bubble to the window.
- Date boxes are square with small gaps (`--pc-gap`), sized by the panel width. When the window is short, shrink the panel width (`--pc-tile-max` in `base.css` and `compact.css`), never the box height, or the squares end up small in wide columns.
- The wallpaper is painted on the root element's background by `usePageBackdrop` in `App.jsx`, not on a fixed `<div>`: iPhone Home Screen apps can report a page height shorter than the screen and clip fixed elements at that height, leaving a bar along the bottom. The image is sized like CSS `cover` over a box `WALLPAPER_OVERSCAN_PX` taller than the viewport, top-anchored, matching what the glass refracts (`wwn-glass/stars.js`, `lib/adaptive-ink.js`). Never put a background on `<body>`.
- Diagnostics: pressing and holding the info button opens `DebugPanel` (`src/diagnostics.js`). When an installed iPhone app reports a page shorter than the screen (`viewportDeficit()`), the wallpaper's last stretch fades into the plain page colour, because the strip below the page can show only that colour. Check the card's numbers before guessing at layout fixes that cannot be tested here.
- Glass date tiles (branch `LQtest`): `src/photo-calendar/glass-tiles/` draws every date box as a WWN liquid-glass tile on one shared canvas (`GlassTileGrid`), with day photos fed through `photoLayer.js`. A glass button at the bottom right (`src/TileStyleToggle.jsx`, labelled with the style a press switches to, remembered in localStorage `mycal.tileStyle`) switches between the two; `?lq=0` or `?lq=1` in the URL overrides it, and `liquidTiles={false}` on `PhotoCalendar` turns it off in code (falls back to the plain CSS boxes). Tile rim, bend and tint are computed from the tile size in `GlassTileGrid.jsx`; the rim bends inward (negative) because positive bend pulls in the neighbouring tile.
- Never run commands that change git history or push unless asked. Commit messages carry no AI co-author or attribution trailers.

## Ideas backlog

### Native iOS app
Turn the calendar into an iOS app that reads the Photos library through PhotoKit and fills the calendar from it. Two routes: wrap this web app (Capacitor or WKWebView) with a PhotoKit plugin, or rebuild in SwiftUI with iOS 26 Liquid Glass. Not started. The full write-up and open questions are in `README.md`, under "Idea for later: native iOS app".

### iPhone widget
A PWA cannot provide one (WidgetKit is native only). Options: a widget extension inside the native iOS app, or an exported month image shown by the built-in Photos widget. Not started. Full write-up in `README.md`, under "Idea for later: an iPhone widget".

### Other open items
- Dedicated cleanup so Write-With-Nature and this repo share one copy of the glass code (a shared package) instead of two. Details in `src/photo-calendar/wwn-glass/README.md`.
- Test the glass against other page background colours.
- Photo loading: manual import from the photo picker is done, and the Write-With-Nature sample photos have been removed. Still open: hands-free sync of the Favourites album (Shortcuts automation, or the native iOS app above), and removing single photos.
