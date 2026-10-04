# My Calendar

A photo calendar for a photographer: one customizable calendar element, etched onto a liquid glass panel, where every day shows the photos shot on that date. Think of a GitHub contributions graph, but for photography.

## Run it

```
npm install
npm run dev        # http://127.0.0.1:5173
```

The calendar starts empty. Tap the **gear** at the top left, then **Import photos**, to add photos from your device (see below). The calendar component itself can also take a list of photo URLs whose file names end in a date, for example `harbour_2026-10-03.webp`.

## Add your own photos

Tap the **gear** at the top left, then **Import photos**. The system photo picker opens and you choose which photos to add (in the picker, the Albums tab lets you open Favourites and select them all). Each photo is placed on the day it was taken, read from its EXIF capture date. A photo with no capture date, such as a screenshot, uses the file's date instead. How many photos were added, skipped or unreadable shows in a toast that disappears after three seconds. Picking the same photo twice is ignored.

- **Everything stays on the device.** Photos are saved in the browser's own storage (IndexedDB) on your phone. Nothing is uploaded, and the import code makes no network requests. The site's code comes from GitHub Pages; your photos never do.
- **Install first, then import.** An installed home-screen app and Safari keep separate storage on iPhone, so add photos from inside the installed app.
- **Remove photos**, in the same gear menu, deletes this app's copies only, never your Photos library.
- **Limits:** iOS can clear a web app's storage if the phone is very low on space, or if you delete the app or clear website data. Keep the originals in Photos. Importing is manual: new photos need another visit to **Add more photos**.
- Code: `src/photo-library/` (storage, date reading, previews, the button strip). Grid cells use small previews; the full-screen viewer loads the original.

## Wallpaper

The calendar sits on a wallpaper. By default it is a frosted wash of peach and light pastel blue, drawn by the app (`src/photo-library/default-wallpaper.js`). In the gear menu, **Set wallpaper** opens the photo picker and uses the photo you choose instead (**Change wallpaper** once one is set), and **Reset wallpaper** brings the default back. The wallpaper is shrunk to screen size and kept on the device like the photos.

The glass refracts the wallpaper, using Write-With-Nature's liquid glass, so it bends and blurs whatever is behind it. All text adapts to how dark the wallpaper is directly behind it: light text over dark areas, dark text over light areas, chosen separately for the calendar, the day view, the gear menu and the note under the calendar. A soft wash over the glass keeps text readable on busy photos.

## Install it as an app (PWA)

The calendar is a progressive web app: installable, full-screen, and usable offline.

- **iPhone / iPad (Safari):** Share, then "Add to Home Screen".
- **Android / desktop Chrome and Edge:** use the install icon in the address bar, or the menu's "Install app".

How it works: `public/manifest.webmanifest` describes the app, `public/sw.js` is the service worker, and `src/pwa/register.js` registers it (production builds only). Every built file is precached, so after one online visit the app opens offline, and photos you imported are already on the device. Each deploy gets a new cache version automatically, and the old one is removed.

Icons are generated from `public/icons/icon.svg` with `npm run icons` (needs Chrome installed).

## Host it on GitHub Pages

`.github/workflows/pages.yml` builds and deploys on every push to `main`. One-time setup:

1. In the repo on GitHub: **Settings, Pages, Build and deployment, Source: GitHub Actions**.
2. Push to `main`. The site appears at `https://vegamorningstar.github.io/My_Calendar/`.

The build uses relative URLs (`base: './'`), so it works from that project path, from a custom domain, or from any folder, with nothing to configure. To preview the production build locally: `npm run build && npm run preview`.

## Screen sizes

The layout responds to the calendar's own width rather than the screen's, using container queries. On a laptop it is a wide grid with weekday names in each cell; on an iPad it scales down; on an iPhone the header stacks, the year view drops to two columns, and the day view becomes a near full-screen sheet with a two-column photo layout. The page respects the iPhone notch and home indicator when installed.

## What it does

- Month pages with real calendar dates, stepped with the glass arrows or the arrow keys.
- Days with photos show them, rotating at random times (never all at once). Hover for the photo count.
- Click a day for a full-screen view with the date and every photo from that day as a grid of thumbnails. Close it with the burgundy X, Esc, or by clicking away.
- In that view, the left and right arrow keys, a swipe left or right, or the arrow buttons jump to the previous or next day that has photos.
- Tap a thumbnail for the photo full screen, fitted to the screen. Gestures follow the iPhone Photos app: double-tap to zoom in (and again to zoom out), pinch to zoom, drag to pan, swipe left or right for the next photo, swipe down to close, tap once to hide the buttons. On a computer: double-click, trackpad pinch or Ctrl+scroll, `+` `-` `0`, and the arrow keys.
- Zoom out to a full year with the year button (or Esc / `y`), then click a month to zoom back in.
- Text adapts to the colour behind it, light on dark and dark on light, on the page and on photos.

## Layout

```
src/photo-calendar/     the whole element, self-contained (see its README)
src/photo-library/      picking photos, reading their dates, storing them on the device
src/App.jsx             demo page: loads the manifest and renders the calendar
public/                 manifest, service worker, icons
scripts/gen-icons.mjs
```

The glass comes from Write-With-Nature and lives in `src/photo-calendar/wwn-glass/` behind a single entry point. See `src/photo-calendar/README.md` and `src/photo-calendar/wwn-glass/README.md`.

## Idea for later: native iOS app

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
