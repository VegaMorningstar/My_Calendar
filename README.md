# My Calendar

A photo calendar for a photographer: one customizable calendar element, etched onto a liquid glass panel, where every day shows the photos shot on that date. Think of a GitHub contributions graph, but for photography.

## Run it

```
npm install
npm run dev        # http://127.0.0.1:5173
```

`npm run dev` first rebuilds `public/photos/manifest.json` from the files in `public/photos/`. Photos are matched to days by a date at the end of the file name, for example `harbour_2026-10-03.webp` (`YYYY-MM-DD` or `YYYYMMDD`). The bundled photos are samples borrowed from Write-With-Nature.

## Install it as an app (PWA)

The calendar is a progressive web app: installable, full-screen, and usable offline.

- **iPhone / iPad (Safari):** Share, then "Add to Home Screen".
- **Android / desktop Chrome and Edge:** use the install icon in the address bar, or the menu's "Install app".

How it works: `public/manifest.webmanifest` describes the app, `public/sw.js` is the service worker, and `src/pwa/register.js` registers it (production builds only). Every built file is precached, and the photo list plus up to 150 photos are cached at install, so after one online visit the whole calendar works offline. Each deploy gets a new cache version automatically, and the old one is removed.

Icons are generated from `public/icons/icon.svg` with `npm run icons` (needs Chrome installed).

## Host it on GitHub Pages

`.github/workflows/pages.yml` builds and deploys on every push to `main`. One-time setup:

1. In the repo on GitHub: **Settings, Pages, Build and deployment, Source: GitHub Actions**.
2. Push to `main`. The site appears at `https://vegamorningstar.github.io/My_Calendar/`.

The build uses relative URLs (`base: './'`), so it works from that project path, from a custom domain, or from any folder, with nothing to configure. To preview the production build locally: `npm run build && npm run preview`.

New photos: add the files to `public/photos/` (named with their date), run `npm run photos` (the build does it too), commit and push.

## Screen sizes

The layout responds to the calendar's own width rather than the screen's, using container queries. On a laptop it is a wide grid with weekday names in each cell; on an iPad it scales down; on an iPhone the header stacks, the year view drops to two columns, and the day view becomes a near full-screen sheet with a two-column photo layout. The page respects the iPhone notch and home indicator when installed.

## What it does

- Month pages with real calendar dates, stepped with the glass arrows or the arrow keys.
- Days with photos show them, rotating at random times (never all at once). Hover for the photo count.
- Click a day for a full-screen view with the date and every photo from that day. Close it with the burgundy X, Esc, or by clicking away.
- Zoom out to a full year with the year button (or Esc / `y`), then click a month to zoom back in.
- Text adapts to the colour behind it, light on dark and dark on light, on the page and on photos.

## Layout

```
src/photo-calendar/     the whole element, self-contained (see its README)
src/App.jsx             demo page: loads the manifest and renders the calendar
public/photos/          sample photos
scripts/gen-manifest.mjs
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
