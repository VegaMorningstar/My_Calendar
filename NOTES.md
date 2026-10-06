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
- **Updates reach an installed app without deleting it.** `public/sw.js` installs a new version in the background and lets it WAIT (only the first ever install activates at once); `src/pwa/register.js` notices it, `src/pwa/UpdatePrompt.jsx` shows a glass pill "New version available, tap to reload" above the bottom buttons, and the tap sends `SKIP_WAITING`, after which the page reloads once. Nothing from the old version is deleted until the tap, so a running page can still load its pieces. The app looks for a new version whenever it comes to the front, comes back online, and every 30 minutes; `sw.js` is registered with `updateViaCache: 'none'`, and the install and the page loads skip the browser's own 10 minute cache (GitHub Pages serves everything with `max-age=600`). The build time is on the diagnostics card (`__BUILD_TIME__`), so a phone's version can be checked. Tested with a production build served by `vite preview` (build one version, deploy the next underneath, watch the prompt appear and the tap reload); it cannot be tried in the dev server because the service worker only registers in production builds.
- PWA and hosting: the app builds with relative URLs (`base: './'`) so it works on a GitHub Pages project path. `public/sw.js` has placeholders that `vite.config.js` fills at build time; do not hard-code asset names in it.
- Imported photos live only in IndexedDB on the device (`src/photo-library/`). Never add code that uploads them. Dates come from the EXIF string as written (no timezone conversion); keep `reviveValues: false` and do not combine it with `pick` (exifr 7.1.3 throws). A change to how photos are stored needs an IndexedDB upgrade step so no update ever needs a wipe.

### Layout

- The calendar responds to its own width (container queries in `src/photo-calendar/styles/`), not the viewport. The day view is the exception: it is a portal, so it uses viewport media queries.
- **The document never scrolls**: `html`, `body` and `#root` are exactly the screen, `body` is fixed; `.stage` is the only scroll container and scrolls only when the content is genuinely taller than the screen. Every row (the gear, info button, tile style button and note) stays within the screen width. Scroll listeners use capture.
- **Date boxes are square** with small gaps (`--pc-gap`), sized by the panel width. **Exception: a phone on its side** (`compact.css`, `app.css`), where the height is all there is. There the boxes are wider than tall (`--pc-tile-ratio: 1.333`, i.e. 4:3 like a typical landscape photo; 1.5 and 1.7 were tried and cropped photos too much; set it to 1 for squares) and are sized from the height left: the screen less the page padding (which grows with the iPhone's safe-area margins, the home indicator takes 21px), less 68px for the header, weekday row and panel padding, less the row gaps, split between the month's rows (`--pc-rows`), so a five-row month gets taller boxes than a six-row one. The panel takes the whole width less the safe-area margins. **The gear, info and flat/glass buttons are not on the first screen in landscape:** they sit in a row below the calendar, and the page scrolls (about 100px, no scroll bar) to reach them; the calendar column is at least one full screenful, so the calendar is centred and the buttons start below the fold. The page-level scroll bar is hidden everywhere (`.stage`). Tested on every current iPhone landscape size (667x375 to 956x440) with emulated safe-area insets (`Emulation.setSafeAreaInsetsOverride`: left and right 47 to 62, bottom 21), for 4, 5 and 6-row months: nothing outside the usable area, and the settings menu fits once scrolled to.
- **Wrap, do not overflow**: rows on the calendar panel and the day sheet are `flex-wrap: wrap` (`.pc-head`, `.pc-title-row`, `.pc-detail-head`). When a month name or weekday is long or the panel is narrow, the arrows (and the day sheet's buttons) drop beneath on the right. Anything new on a panel must wrap or shrink (`min-width: 0`), not take a fixed width.
- **Get your calendar** (built, not pushed; branch `export-calendar`): a glass button at the right end of the bottom row (`src/GetCalendarButton.jsx`, with a lilac glow: `glow` on the item, `buttonGlow` in `wwn-glass/theme.js`, `glowBreath: false` and `litTint` in its material so the glow is steady and the idle page still draws nothing). It opens `src/photo-calendar/export/ExportPage.jsx` for the month on screen (`PhotoCalendar` reports it through `onViewChange`; `paused` stops its keys while the page is open). The page is plain, like the year view (no glass): the wallpaper, a sheet showing the month's calendar, the page-shape button, Back and Save. The sheet is one canvas drawn by `drawCalendarPage.js` from the numbers in `pageLayout.js`, at screen size for the preview and at full size for the file, so what is seen is what is saved. Months can be changed on the page (the arrows beside the title, the left and right keys, or a swipe on the sheet); the choice for each day is remembered per month. A shuffle button (crossing arrows, no text), level with the shape button and the hint, picks a random photo for every day of the month that has more than one, never the one already showing; it is disabled in a month where no day has several. The page's shape is one button with no text, a phone drawn upright or on its side that turns when pressed (it shows the current shape), and the sheet starts in the screen's own shape. Tap a day with photos (invisible buttons over the sheet, keyboard reachable) to choose which of its photos is on the sheet, or none. The first photo of each day is the default. Text is pure black or white from the wallpaper behind it. Save renders a PNG of the whole page (landscape 3300x2550, portrait 2550x3300: US Letter at 300 dpi; photos come from the stored 720px previews, which is about right at that size) and sends it through the share sheet on a phone (`navigator.share` with a file; if the browser wants a fresh tap, a "Save the picture" button appears) or downloads it on a laptop (`saveImage.js`). The bottom row wraps its right-hand pair (flat/glass and Get your calendar) to a second row on a screen under about 360px wide, and the calendar makes room for it (`--pc-extra-height` from `App.jsx`). 
**Still to decide about the export:** the file format (PNG now; JPEG would be a lot smaller, PDF suits printing), the paper size (US Letter now; A4 and others), whether to let the person pick a size, whether to use the full-size originals for large prints (the 720px previews are used now), whether photos should be saved to Photos or Files, and extras (a title, a note per day, week start).
- **Header**: the year button sits beside the month name, with its digits on the month's baseline (`--pc-month-size`); beneath is the photo count, "x photos this month", small and italic with no highlight line. In year view the title is the year and the button shows the month it returns to.
- **While a day is open only the day sheet and the wallpaper show.** `DayDetail` adds `pc-day-open` to the root element, and `app.css` fades out `.stage-column` (the month or year panel) and `.stage-footer` (gear, info, flat/glass buttons) and makes them unclickable; they fade back when the day closes. The update prompt is not part of the stage and stays available. (Branch `test01` collects this with the day sheet's frost changes; not pushed.)
- **Day sheet is frosted by blur only, and looks the same on every day.** Its glass is built with `showPhotos={false}`, so the date photos in the calendar behind it are not part of the picture it refracts. It blurs the wallpaper more than the calendar panel does (`SHEET_BLUR` in `DayDetail.jsx`) and has no colour wash on top: a wash (white, black, or the wallpaper's own colour) showed as a flat rectangle in the middle of the glass and was taken out. The full-screen veil behind the sheet is a constant neutral dim (14% black) plus the blur, not a wash that follows the text colour. Only the text colour follows the wallpaper's brightness (the average behind the whole sheet, a hard switch at 0.5). The `<`, `>` and ✕ buttons on the sheet are frosted the same way (`showPhotos={false}` on `GlassButtons`, the same blur), carry no tint at all (clear glass), and show pure white glyphs on any wallpaper (`WHITE_INK` in `DayDetail.jsx`); their rims are left sharp (`edgeBlurMultiplier: 0`) so the edge still refracts. Known cost: white on clear glass is faint over a pale or white wallpaper, and a neutral smoke tint (about 30% black) was removed on request for that reason.
- **Only the photos scroll on the day sheet.** The date, the "Day x of 365" line and the buttons stay put; the photos are in their own scroll area (`.pc-gallery-scroll`), which fades out over the last 12px at its top and bottom. `.pc-sheet-scroll` is now a plain column (`overflow: hidden`) and every box in the chain has `min-height: 0`, which is what lets the photos' box take whatever height is left. The scroll bar is hidden (`scrollbar-width: none` and `::-webkit-scrollbar { display: none }`); scrolling by touch, trackpad, wheel and keys works as before.
- **Day sheet**: held to the screen height (a one-cell grid, `minmax(0, 1fr)`) so a day with many photos scrolls inside it (the photos only, see above); padded by the safe-area insets so it clears the status bar and home indicator.

### Look

- **No all-caps text.** Do not use `text-transform: uppercase` or write text in capitals; use normal sentence case ("Day 276 of 365 · 3 photos", "Sun Mon Tue"). Wide letter-spacing belongs to capitals, so keep tracking small (about 0.03 to 0.05em). Check: no element has a computed `text-transform` other than `none`, and no visible text has three capital letters in a row.
- **Text is pure black or pure white, never a grey in between.** The two inks are exactly `#000` and `#fff` (`MATERIAL_DEFAULTS` letter colours in `wwn-glass/glass-alphabet/constants.ts`, the `--pc-ink` / `--lib-ink` defaults in the CSS), the text is fully opaque (no `rgba` text colours), and the switch between them is a hard threshold at luminance 0.5 (`inkFor` in `lib/adaptive-ink.js`, and a 0.495 to 0.505 band in the shader). In the glass shader the ink is laid on after the tint, so a letter is exactly the ink colour. The only deliberate exceptions are accent colours with a meaning: the burgundy close button and the red "Remove photos" item. Checking: read the computed `color` of every text element and expect only `rgb(0, 0, 0)` or `rgb(255, 255, 255)`.
- **Text colours**: use `usePageInk(ref)` with a ref to the element the text sits in (and a `region` for text in one corner), so the ink follows the brightness directly behind that spot, firmly light or dark and never a blended grey. Do not hard-code text colours over glass or photos. No glow or blur halos on text: the look is a hairline engraved highlight only (the photo count has none by request).
- **Glass kit**: the gear, info button, tile style button, header buttons and menus use WWN glass through the calendar's glass kit (`photo-calendar/index.js`): `GlassButtons` for buttons, `LiquidGlassPanel` for panels. Match that physics for any new glass element; no CSS look-alikes.
- **Glass panels**: give every `LiquidGlassPanel` its params from `usePanelEdge(ref)` and set its `border-radius` to `calc(var(--pc-panel-r) - var(--pc-edge, 0px))`. The hook fixes the rim in pixels, inside the padding, and publishes `--pc-edge` to compensate the corners. The calendar panel has no grain and no white gradient wash (removed by request); the faint violet tint, blur, white outline and soft white shadows remain.
- **Glass date tiles** (`src/photo-calendar/glass-tiles/`): every date box is a WWN glass tile on one shared canvas (`GlassTileGrid`). Empty tiles take no tint (clear glass, marked by the bevel highlight alone); tiles showing a photo take no tint either, so the picture is seen through clear glass; today's tile keeps a faint teal. The rim bends inward (negative bend), because outward pulls in the neighbouring tile. A glass button at the bottom right (`src/TileStyleToggle.jsx`, labelled with the style a press switches to, remembered in localStorage `mycal.tileStyle`) switches to the plain boxes; `?lq=0` or `?lq=1` overrides it, and `liquidTiles={false}` on `PhotoCalendar` turns it off in code.
- **Photo rotation**: on a day with several photos, each photo stays up at least 5 seconds (`rotateMs`), with a random extra of up to 40% so tiles do not swap in step.

### Gestures

- Swipe steps the month or year (`useSwipeNav` for touch, `useTrackpadSwipe` for a laptop). Pinch changes level, year / month / day (`usePinchZoom`: two fingers, a ctrl+wheel trackpad pinch, and Safari's gesture events): fingers together goes up a level (month to year; a day back to its month), fingers apart goes down (year to month; a month to its latest day that has photos, and nothing if the month has none). The month panel listens on the panel and the day sheet on its overlay; the hook is switched off while the photo viewer is open (pinching there zooms the photo), and one pinch changes only one level across all listeners (a shared lock that outlasts a trackpad's stream of events, otherwise closing a day would carry on to the year). The day sheet ignores a swipe when more than one finger was down. The panel and the overlay keep `touch-action: pan-y` so the browser leaves pinches to the app. Safari's gesture events cannot be tested in headless Chrome, so check a real iPhone after changing them.

### Wallpaper and first paint

- The frosted default and any photo the user picks go through one path: the page shows it, `setBackgroundImage` hands it to the glass, and the glass draws it through the `wwn-glass/stars.js` stand-in. Do not edit the copied WWN files to add it.
- The wallpaper is painted on the root element's background by `usePageBackdrop` in `App.jsx`, not on a fixed `<div>` and never on `<body>`: an iPhone Home Screen app can report a page shorter than the screen and clip fixed elements there. The image is sized like CSS `cover` over a box `WALLPAPER_OVERSCAN_PX` taller than the viewport, top-anchored, matching what the glass refracts.
- Fast start: the wallpaper is painted before the app loads (script in `index.html`, using the hint that `src/photo-library/wallpaper.js` keeps in localStorage under `mycal.wallpaper`). When changing wallpaper code, keep `readWallpaperHint`, the early script and `useWallpaper` in step, and never make the first render wait for IndexedDB. The default wallpaper and its `default-wallpaper-meta.json` come from `npm run default-wallpaper`; the fonts are hosted in `public/fonts`, not loaded from Google.
- **Bottom strip on iPhone**: when an installed app is given a page shorter than the screen (`viewportDeficit()` in `src/diagnostics.js`), the strip below the page can only show the plain page colour. The wallpaper's last stretch fades into it, and every full-screen layer must fade out over the same stretch instead of ending in a hard line: the day view's veil (`.pc-overlay::before`) and the photo viewer's backdrop (`.pc-viewer::before`) use `--pc-fade`, which `App.jsx` sets from the deficit. Any new full-screen layer needs the same treatment. Pressing and holding the info button opens a diagnostics card with the numbers; check it before guessing at layout fixes that cannot be tested here.

## Open discussions

Decide these together before building. Items 1, 4 and 5 have longer write-ups below.

1. **Updates that keep user data, and backup.** Part 1 (the update prompt) is built; part 2 (export and import a backup) is still to discuss. Questions to settle are listed in its section.
2. **Photo storage: keep references instead of copies, or make the copies smaller.** A web app cannot keep references into the Photos app, so the choices are a smaller copy in the PWA or a native app. Undecided; full write-up below.
3. **Load jump on refresh.** The first frame shows the "No photos yet" hint and smaller date boxes, because `App.jsx` decides the library is empty before the photos have loaded. Then the photos arrive, the hint disappears and the panel grows by about 56px. Fix: hold the hint and its extra height until `ready` from `usePhotoLibrary`. Agreed to come back to it.
4. **Native iOS app.** Write-up below.
5. **iPhone widget.** Write-up below.
6. **Calendar export: file format and where it is saved.** The export page works (see "Get your calendar" under Layout); the format, the paper size and where the file goes are still to decide. Notes under that heading.

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

### Photo storage: references instead of copies, and making the copies smaller

Discussed, nothing changed. The question was whether the app could store a path to each photo in the Photos app and load it from there, instead of storing the photo.

**What the app stores today** (`src/photo-library/`): for each imported photo, one record `{ id, name, size, date, blob, thumb }`. `blob` is the full file exactly as the picker handed it over (about 2 to 4 MB for a 12 megapixel photo), `thumb` is a 720px JPEG (quality 0.82, about 60 to 100 KB) made at import. The tiles and the day view use `thumb`; only the full-screen viewer uses `blob`. The id is `name|size|date` of the original file, so picking the same photo twice adds it once. The wallpaper is a JPEG up to 2400px on its long side, plus a tiny blurred preview.

**Why a PWA cannot store a reference** (iOS Safari and Home Screen apps):
- The file picker returns a temporary copy (a `File`), not a location. The real path is hidden; the page learns only the name, size and type (for example `IMG_1234.HEIC`).
- The Photos app's internal id for each photo (`PHAsset.localIdentifier`) is not available to web pages.
- The file handle API that lets a page reopen a file later (`showOpenFilePicker` with a stored handle) is not supported in Safari. Only the origin private file system is, and that is the app's own storage, not the user's files.
- iOS has no supported web link that opens a specific photo in the Photos app.
So the only way to show a photo later is to keep a copy of it.

**The version of the idea that works: a native iOS app.** It asks for Photos permission once (full or limited access), stores only each photo's `localIdentifier` and date (a few bytes), and loads the picture through PhotoKit when needed. No copies, so almost no storage, and new photos can appear without importing. This is the "native iOS app" idea above; the web UI could be wrapped (Capacitor or a `WKWebView`) with a small plugin that hands PhotoKit thumbnails and dates to the page. If the native app goes ahead, build the "ids only" design there from the start and do not spend much on shrinking PWA copies.

**Strategies to cut the PWA's storage** (sizes per photo are estimates, not measured on real photos):

| What is kept | Per photo | 100 photos | Full-screen quality |
|---|---|---|---|
| Full copy (today) | about 2 to 4 MB | 200 to 400 MB | original |
| Copy shrunk to 3000px | about 1 MB | about 100 MB | sharp on every screen, slightly soft only when zoomed far in |
| Copy shrunk to 1600px | about 300 KB | about 30 MB | sharp at full screen on a phone, soft when zoomed |
| 720px preview only | about 60 to 100 KB | 6 to 10 MB | visibly upscaled at full screen (a phone is about 1170px wide) |

Options, from most to least conservative:
1. **Cap the stored copy at 3000px** (already agreed as the likely first step). About a third of the space, near-identical look.
2. **Cap it at 1600px.** About a tenth of the space; still sharp at full screen on a phone.
3. **Keep a mid-size copy by default, and make "keep full quality" an option** for photos the person chooses.
4. **Keep only the preview and the date**, and show the preview at full screen. Smallest, but visibly softer.
5. **Smaller previews too:** the 720px preview could be 480 to 600px at quality 0.75 for roughly half its size, since tiles are small (the day view's grid is the largest use).
6. **WebP instead of JPEG** for the copies and previews, if Safari's encoder is reliable for it (smaller at the same quality; needs a quick test on the target iOS).
7. **Wallpaper at about 1500px** instead of 2400px: it is blurred under the glass and cover-fitted to a phone, so it is stored larger than anything can show.

How it would be built: shrink at import with `createImageBitmap(file, { resizeWidth, resizeHeight, resizeQuality: 'high' })` (it applies the EXIF rotation and avoids holding the full decoded bitmap in memory), keep computing the id from the original file so duplicate detection still works, and add a one-off step that shrinks the copies already stored (the existing library). HEIC files: check that the iOS picker converts or that `createImageBitmap` decodes them. Photos shot in Portrait or Live modes may carry extra data that shrinking drops, which is fine.

**Questions to settle:**
1. How much does sharp full-screen and zoom matter compared with storage?
2. Is the native app a real plan or a someday idea? If real, the PWA copies only need to be small enough for now.
3. Which cap: 3000px, 1600px, or mid-size by default with an optional full-quality copy?

### Swipe between months stopped working once (not reproduced, fix prepared and not shipped)

Reported once, on the owner's iPhone, right after the pinch between levels went live: swiping sideways on the month panel did not change the month. A later check of the live app on the phone found it working, so nothing was changed. Not reproduced in headless Chrome either (phone portrait and landscape, with vertical drift, and after pinches that open and close a day).

**The likely cause, from reading the code** (`src/photo-calendar/hooks/useSwipeNav.js` as it is now): it keeps a set of pointer ids that are down and decides on a swipe only on `pointerup`. If the phone cancels a touch part way (the page starts to scroll; in landscape the page now scrolls vertically, so a drag with some vertical drift can be taken for a scroll) or a lift is missed, a stale id stays in the set, `down.size` stays above 1 for later touches, and every later swipe is ignored until the app is reloaded. Opening a day with a pinch while two fingers are down (month panel to day sheet) is one way the stale id could appear. Proven in a test with synthetic pointer events: after a `pointercancel`, and after two fingers that never lifted, the current code makes no more swipes.

**The fix, ready on the local branch `fix-swipe` (commit `16925d8`, based on `94a3b1d`; not pushed, so it exists only on this Mac):**
- `useSwipeNav` decides the moment the drag passes the threshold (60px, mostly sideways), in `pointermove`, not on the lift, so a touch cancelled afterwards still counts.
- No state is kept between touches: each first finger (`isPrimary`) starts afresh, and a second finger cancels the swipe (it is a pinch).
- The same approach in the day sheet's swipe between days (`DayDetail.jsx`), and `usePinchZoom` forgets leftover fingers on a new first finger.
- Side effect: the month changes while the finger is still moving, as soon as it has gone far enough, instead of after the lift.

**If it happens again:** first note what was done just before (a pinch, rotating the phone, opening a day) and whether reloading the app fixes it (a stale-finger bug is cured by a reload). Then apply the prepared fix: `git cherry-pick 16925d8` from the `fix-swipe` branch, or re-create it from the description above, and test with a synthetic `pointercancel` and a never-lifted second finger (the two cases above) as well as a normal swipe, a swipe with vertical drift, and a swipe after pinching.

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
