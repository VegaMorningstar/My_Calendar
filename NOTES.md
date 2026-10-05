# Project notes: My Calendar

One file for how we work here and what is still undecided. It is the single source of truth: `CLAUDE.md` just imports it, and the README only describes what the app does. **Keep it up to date**: when a rule changes or an item is settled, change it here in the same commit.

A photo calendar built around one reusable element, `src/photo-calendar/`. See `README.md` for what it does and how to run it.

## Ground rules

### How we work

- **Commits and pull requests carry no mention of Claude or Anthropic**: no `Co-Authored-By` trailer, no "Generated with" line, no AI author. Strict, in every commit, and it overrides any default.
- **No em dashes anywhere** (code, comments, docs, commit messages). Use a comma, colon, parentheses or a plain hyphen.
- **Show UI changes on localhost** (`http://127.0.0.1:5173`) before pushing when asked, with `?lq=0` to compare against the plain boxes if useful.
- **Push only when told to.** Never run commands that change git history or push otherwise. Pushes use the `github-personal` SSH host (the VegaMorningstar account); do not use other keys. Pushing to `main` deploys to GitHub Pages, which is what the owner tests on their phone.
- **"Think only", "brainstorm" or "investigate first" means no code changes.** Discuss, then build after the owner agrees.
- **Test before saying done**: layout at phone, iPad and laptop sizes, portrait and landscape, with no sideways or up-and-down page scroll, measured and not guessed. Say plainly what could not be tested here (the installed iPhone app, Safari's own gestures) and ask for a check on the phone.
- **Neat and clean**: nothing may run off a panel or the screen, at any text length or width. Check the longest text (September, Wednesday) at 320px wide.

### Code

- Comment the code: a header on every file saying what it is for, and a short doc comment on each exported function, hook and component. Match the style of the surrounding code.
- Keep the calendar modular and exportable: everything it needs lives inside `src/photo-calendar/`, and other code imports it only through `src/photo-calendar/index.js`.
- All Write-With-Nature (WWN) glass code stays inside `src/photo-calendar/wwn-glass/`, imported only through its `index.js`. Local changes to the copied WWN files are marked `LOCAL CHANGE` and listed in that folder's README (today: the optional letter font family, and the date-tile highlight fading out over the flat body in `glass-alphabet/scene.ts`).
- **The glass draws only when something changed.** Scenes skip the upload and the draw on a frame where nothing new was set; a glass piece that changes its backdrop canvas or resizes its canvas must call `scene.invalidate(reason)`, and anything drawn over the wallpaper that the glass refracts must call `bumpContent(region)` (see `photoLayer.js`). Details in `src/photo-calendar/wwn-glass/README.md`. Check `glass frames drawn / skipped` on the diagnostics card: an idle page should draw nothing.
- Keep the typegpu packages pinned exactly: `typegpu` 0.12.4, `@typegpu/sdf` and `@typegpu/noise` 0.12.0, `unplugin-typegpu` 0.12.3. `typegpu` 0.12.6 renders the glass panel black, and `unplugin-typegpu` 0.12.4 demands 0.12.6, which breaks `npm ci`.
- PWA and hosting: the app builds with relative URLs (`base: './'`) so it works on a GitHub Pages project path. `public/sw.js` has placeholders that `vite.config.js` fills at build time; do not hard-code asset names in it.
- Imported photos live only in IndexedDB on the device (`src/photo-library/`). Never add code that uploads them. Dates come from the EXIF string as written (no timezone conversion); keep `reviveValues: false` and do not combine it with `pick` (exifr 7.1.3 throws). A change to how photos are stored needs an IndexedDB upgrade step so no update ever needs a wipe.

### Layout

- The calendar responds to its own width (container queries in `src/photo-calendar/styles/`), not the viewport. The day view is the exception: it is a portal, so it uses viewport media queries.
- **The document never scrolls**: `html`, `body` and `#root` are exactly the screen, `body` is fixed; `.stage` is the only scroll container and scrolls only when the content is genuinely taller than the screen. Every row (the gear, info button, tile style button and note) stays within the screen width. Scroll listeners use capture.
- **Date boxes are square** with small gaps (`--pc-gap`), sized by the panel width. `--pc-tile-max` in `base.css` fits the month's rows (`--pc-rows`) to the screen height after the header, padding and bottom buttons (an allowance of 268px, plus the row gaps, plus `--pc-extra-height`). If the header or footer changes height, re-measure and adjust that number so nothing scrolls. When the window is short, shrink the panel width, never the box height.
- **Wrap, do not overflow**: rows on the calendar panel and the day sheet are `flex-wrap: wrap` (`.pc-head`, `.pc-title-row`, `.pc-detail-head`). When a month name or weekday is long or the panel is narrow, the arrows (and the day sheet's buttons) drop beneath on the right. Anything new on a panel must wrap or shrink (`min-width: 0`), not take a fixed width.
- **Header**: the year button sits beside the month name, with its digits on the month's baseline (`--pc-month-size`); beneath is the photo count, "x photos this month", small and italic with no highlight line. In year view the title is the year and the button shows the month it returns to.
- **Day sheet is frosted.** Its glass is built with `showPhotos={false}`, so the date photos in the calendar behind it are not part of the picture it refracts (they used to show through as blurred shapes). It blurs the wallpaper more than the calendar panel does (`SHEET_BLUR` in `DayDetail.jsx`) and carries a wash in the colour opposite the text (`--pc-frost`, 34%, in `detail.css`; it starts inside the glass rim so the rim stays clear and fades in over 48px so it blends into the edges), so the text and photos on it stay clear on any wallpaper. The ← → and ✕ buttons on the sheet are frosted the same way (`showPhotos={false}` on `GlassButtons`, the same blur); the arrows carry a teal cast mixed into the frost colour, and the close button keeps its burgundy. Their rims are left sharp and untinted (`edgeBlurMultiplier: 0`, `ringTint: 0`), so only the middle is frosted and the edge still refracts.
- **Day sheet**: held to the screen height (a one-cell grid, `minmax(0, 1fr)`) so a day with many photos scrolls inside it; padded by the safe-area insets so it clears the status bar and home indicator.

### Look

- **Text is pure black or pure white, never a grey in between.** The two inks are exactly `#000` and `#fff` (`MATERIAL_DEFAULTS` letter colours in `wwn-glass/glass-alphabet/constants.ts`, the `--pc-ink` / `--lib-ink` defaults in the CSS), the text is fully opaque (no `rgba` text colours), and the switch between them is a hard threshold at luminance 0.5 (`inkFor` in `lib/adaptive-ink.js`, and a 0.495 to 0.505 band in the shader). In the glass shader the ink is laid on after the tint, so a letter is exactly the ink colour. The only deliberate exceptions are accent colours with a meaning: the burgundy close button and the red "Remove photos" item. Checking: read the computed `color` of every text element and expect only `rgb(0, 0, 0)` or `rgb(255, 255, 255)`.
- **Text colours**: use `usePageInk(ref)` with a ref to the element the text sits in (and a `region` for text in one corner), so the ink follows the brightness directly behind that spot, firmly light or dark and never a blended grey. Do not hard-code text colours over glass or photos. No glow or blur halos on text: the look is a hairline engraved highlight only (the photo count has none by request).
- **Glass kit**: the gear, info button, tile style button, header buttons and menus use WWN glass through the calendar's glass kit (`photo-calendar/index.js`): `GlassButtons` for buttons, `LiquidGlassPanel` for panels. Match that physics for any new glass element; no CSS look-alikes.
- **Glass panels**: give every `LiquidGlassPanel` its params from `usePanelEdge(ref)` and set its `border-radius` to `calc(var(--pc-panel-r) - var(--pc-edge, 0px))`. The hook fixes the rim in pixels, inside the padding, and publishes `--pc-edge` to compensate the corners. The calendar panel has no grain and no white gradient wash (removed by request); the faint violet tint, blur, white outline and soft white shadows remain.
- **Glass date tiles** (`src/photo-calendar/glass-tiles/`): every date box is a WWN glass tile on one shared canvas (`GlassTileGrid`). Empty tiles take no tint (clear glass, marked by the bevel highlight alone); tiles showing a photo take no tint either, so the picture is seen through clear glass; today's tile keeps a faint teal. The rim bends inward (negative bend), because outward pulls in the neighbouring tile. A glass button at the bottom right (`src/TileStyleToggle.jsx`, labelled with the style a press switches to, remembered in localStorage `mycal.tileStyle`) switches to the plain boxes; `?lq=0` or `?lq=1` overrides it, and `liquidTiles={false}` on `PhotoCalendar` turns it off in code.
- **Photo rotation**: on a day with several photos, each photo stays up at least 5 seconds (`rotateMs`), with a random extra of up to 40% so tiles do not swap in step.

### Gestures

- Swipe steps the month or year (`useSwipeNav` for touch, `useTrackpadSwipe` for a laptop). Pinch zooms between month and year (`usePinchZoom`: two fingers, a ctrl+wheel trackpad pinch, and Safari's gesture events); fingers together goes to the year. The panel keeps `touch-action: pan-y` so the browser leaves pinches to the app. Safari's gesture events cannot be tested in headless Chrome, so check a real iPhone after changing them.

### Wallpaper and first paint

- The frosted default and any photo the user picks go through one path: the page shows it, `setBackgroundImage` hands it to the glass, and the glass draws it through the `wwn-glass/stars.js` stand-in. Do not edit the copied WWN files to add it.
- The wallpaper is painted on the root element's background by `usePageBackdrop` in `App.jsx`, not on a fixed `<div>` and never on `<body>`: an iPhone Home Screen app can report a page shorter than the screen and clip fixed elements there. The image is sized like CSS `cover` over a box `WALLPAPER_OVERSCAN_PX` taller than the viewport, top-anchored, matching what the glass refracts.
- Fast start: the wallpaper is painted before the app loads (script in `index.html`, using the hint that `src/photo-library/wallpaper.js` keeps in localStorage under `mycal.wallpaper`). When changing wallpaper code, keep `readWallpaperHint`, the early script and `useWallpaper` in step, and never make the first render wait for IndexedDB. The default wallpaper and its `default-wallpaper-meta.json` come from `npm run default-wallpaper`; the fonts are hosted in `public/fonts`, not loaded from Google.
- **Bottom strip on iPhone**: when an installed app is given a page shorter than the screen (`viewportDeficit()` in `src/diagnostics.js`), the strip below the page can only show the plain page colour. The wallpaper's last stretch fades into it, and every full-screen layer must fade out over the same stretch instead of ending in a hard line: the day view's veil (`.pc-overlay::before`) and the photo viewer's backdrop (`.pc-viewer::before`) use `--pc-fade`, which `App.jsx` sets from the deficit. Any new full-screen layer needs the same treatment. Pressing and holding the info button opens a diagnostics card with the numbers; check it before guessing at layout fixes that cannot be tested here.

## Open discussions

Decide these together before building. Items 1, 4 and 5 have longer write-ups below.

1. **Updates that keep user data, and backup.** Agreed in principle (1 first, then 2); questions to settle are listed in its section.
2. **Photo storage size.** Each import keeps a full copy (about 2 to 4 MB) plus a 720px preview used in the tiles. A resized copy (about 3000px on the long side) would take roughly a third of the space and still look sharp on every screen; only zooming into the full-screen view would show a difference. Existing photos would need a one-off shrink step. Undecided.
3. **Load jump on refresh.** The first frame shows the "No photos yet" hint and smaller date boxes, because `App.jsx` decides the library is empty before the photos have loaded. Then the photos arrive, the hint disappears and the panel grows by about 56px. Fix: hold the hint and its extra height until `ready` from `usePhotoLibrary`. Agreed to come back to it.
4. **Native iOS app.** Write-up below.
5. **iPhone widget.** Write-up below.

### Native iOS app

Not started, written down so we can discuss it.

**Goal:** an iOS app that reads the user's Photos library directly and fills the calendar from it, with no manual file naming or exporting.

**How the pieces would fit**

- **Photo source:** Apple's PhotoKit (`PHAsset`). Each asset has a `creationDate`, which replaces the date-in-the-filename convention. Thumbnails and full images come from `PHImageManager`.
- **Grouping:** bucket assets by local calendar date (device timezone), so a late-night photo stays on the day it was taken.
- **The calendar can already take this data.** `PhotoCalendar` accepts `{ src, date: 'YYYY-MM-DD' }` objects, so a native layer only has to supply a list of image URLs plus dates.
- **Permissions:** `NSPhotoLibraryUsageDescription`, and handling of "limited" access, where the user shares only some photos.

**Two ways to build it**

1. **Wrap the existing web app** (Capacitor, or a plain `WKWebView`) and add a small native plugin that hands PhotoKit thumbnails and dates to the page. Fastest, and reuses everything built so far. Open question: whether WebGPU, which the glass uses for its best look, is available in iOS web views. The glass already has a CSS fallback, so it would still work, only less refractive.
2. **Rebuild natively in SwiftUI.** Month and year views, the day screen and the rotation are all simple to port. iOS 26's own Liquid Glass material (`glassEffect`) could replace the WWN glass. More work, but it feels fully native and avoids the web view entirely.

**Questions to settle first**

- Wrapper or full native rebuild?
- Photos stored in iCloud and not on the device: download on demand, or show only what is local?
- Should it read the whole library, or let the user pick albums?
- Does the glass need to match Write-With-Nature exactly, or may it use Apple's glass on iOS?
- Performance with tens of thousands of photos: thumbnail caching and loading only the visible month.
- Photo metadata, such as an in-app favourites or a "best shot of the day" pick.

### iPhone widget

Not started, written down as an option.

**A PWA cannot provide an iPhone widget.** Home Screen widgets are built with Apple's WidgetKit, which only native apps can use, and iOS 26 does not change that. A real widget therefore means the native app above, with a small widget extension inside it.

**Option 1: a widget inside the native app (the real answer)**

- The app shell holds this web app, plus a small Swift (SwiftUI) widget.
- The app writes the current month's data to a folder shared with the widget (an App Group): thumbnails of the days that have photos, or a photo from "this day" in past years. The widget reads it.
- Tapping the widget opens the app on that day. That needs one addition to the web app: open a given date from a link (for example `?day=2026-10-03`).
- A native shell would also sidestep the iOS 26 status bar problem and could read the Favourites album directly.
- Limits: widgets are static snapshots that iOS refreshes on its own schedule (no live animation, no photo rotation, no WebGPU glass). Sizes are small, medium, large and lock screen. iOS 26 gives widgets a glass look automatically.
- Cost: Xcode on a Mac. A free Apple ID works for your own phone but the app must be re-signed every 7 days; the paid developer account ($99 a year) removes that and allows TestFlight.

**Option 2: no native app, an exported image on the built-in Photos widget**

- The PWA exports a picture of the current month, with the photo thumbnails, and saves it to an album in Photos.
- The built-in Photos widget on the Home Screen is pointed at that album.
- Not a real widget: it is updated by re-exporting by hand, and it cannot open a day when tapped. It needs no native code.

**Small extras available to the PWA today:** an icon badge number (installed web apps on iOS 16.4 and later) and a Shortcuts shortcut as a tappable launcher. Neither shows calendar content.

**Questions to settle first**

- Which widget: a month grid with photo thumbnails, or "on this day" from past years?
- Native app with the free Apple ID (re-sign every 7 days) or the paid account?
- Go native for the widget, or try the exported image first?


### Updates that keep your data, and backup

Not started, written down for discussion. The problem: after a new version, the app has been deleted from the Home Screen and added again to see the update, and on iPhone that wipes the app's own storage (photos, wallpaper, settings), so everything had to be added again. That is not acceptable for future users. The update itself never needs a wipe; deleting the icon does.

**1. Updates that arrive without deleting anything (do first, small)**

- **Likely cause:** an installed iPhone app is usually suspended, not restarted, so it only checks for a new version at launch and can run old code for days. The service worker (`public/sw.js`) already installs and takes over quickly, but the page that is already open never reloads.
- Check for a new version every time the app comes back to the front (`visibilitychange`, then `registration.update()`).
- When the new service worker is ready, show a small "New version, tap to reload" message (or reload on its own when the app is idle).
- Stop GitHub Pages' 10 minute browser cache from serving a stale `index.html` or `sw.js`: register the worker with `updateViaCache: 'none'` and fetch the page with `cache: 'no-cache'`.
- Show the build version in the info card or the diagnostics card, so it is clear which version is running.
- To confirm first: whether the old look really shows until the icon is deleted (stale version) or something else is going on.

**2. Back up and restore**

- An "Export library" button saves the photos, wallpaper and settings to a file through the Share sheet or Files, and "Import backup" restores them. It covers a new phone, an accidental delete, and a future change of web address (storage is tied to the address, so moving to a custom domain would orphan everyone's data without it).
- Photos are big, so a cap on the stored copy (about 3000px on the long side, see the photo storage note below) keeps the backup light.

**Also worth keeping in mind**

- Persistent storage is already requested when photos are added; keep it that way.
- Any change to how photos are stored needs a proper upgrade step (IndexedDB version upgrade), so a new version never needs a wipe.
- A separate test address would let changes be tried without touching real data, but it has separate storage, so test photos would need adding there.
- Removing the problem altogether: the native iOS app above reads the Photos library directly, so nothing needs re-adding. Syncing through an account or cloud would survive a delete, but it means uploading photos, which goes against the rule that photos never leave the device; that would be a deliberate decision.

**Open questions**

- Reload prompt, or reload by itself when idle?
- Export as one file, or in parts for big libraries?
- Cap the stored photo copy at 3000px first?

## Other open items and known issues

- **Check on a real iPhone**: pinch to zoom between month and year (Safari's gesture events), the day view and photo viewer bottom fades, the day sheet's clearance of the status bar, and the header arrows wrapping for long month names.
- The ← → and ✕ buttons in the day view once showed as dark circles in a screenshot; cause unknown, not reproduced. Report if it recurs.
- The year view is not sized to the screen height the way the month view is, so it scrolls on shorter windows and the bottom buttons can sit partly off screen.
- On the installed iPhone app, the photo viewer's picture still ends in a hard edge at the bottom strip (the photo is content, not backdrop), and the blurred preview painted before the app loads also stops there for a moment on launch.
- Empty glass tiles on a very dark wallpaper may be hard to pick out except by their rim; if so, strengthen the rim highlight rather than bring the tint back.
- Slow import of 100+ photos: ideas are resize on decode, progressive display, concurrency, batches, and a timing readout. Not done.
- Photos-app extras not built: share, an info panel, removing single photos, a slideshow, favourites.
- Hands-free sync of the Favourites album (Shortcuts automation, or the native iOS app above).
- One shared copy of the glass code for Write-With-Nature and this repo (a shared package), instead of two. Details in `src/photo-calendar/wwn-glass/README.md`.
- Test the glass against other page background colours.
