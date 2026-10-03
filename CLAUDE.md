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
- Never run commands that change git history or push unless asked. Commit messages carry no AI co-author or attribution trailers.

## Ideas backlog

### Native iOS app
Turn the calendar into an iOS app that reads the Photos library through PhotoKit and fills the calendar from it. Two routes: wrap this web app (Capacitor or WKWebView) with a PhotoKit plugin, or rebuild in SwiftUI with iOS 26 Liquid Glass. Not started. The full write-up and open questions are in `README.md`, under "Idea for later: native iOS app".

### Other open items
- Dedicated cleanup so Write-With-Nature and this repo share one copy of the glass code (a shared package) instead of two. Details in `src/photo-calendar/wwn-glass/README.md`.
- Test the glass against other page background colours.
- Photo loading: manual import from the photo picker is done. Still open: hands-free sync of the Favourites album (Shortcuts automation, or the native iOS app above), and removing single photos.
