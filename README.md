# My Calendar

A photo calendar for a photographer: one customizable calendar element, etched onto a liquid glass panel, where every day shows the photos shot on that date. Think of a GitHub contributions graph, but for photography.

## Run it

```
npm install
npm run dev        # http://127.0.0.1:5173
```

The calendar starts empty. Tap the **gear** at the bottom left, then **Import photos**, to add photos from your device (see below). The calendar component itself can also take a list of photo URLs whose file names end in a date, for example `harbour_2026-10-03.webp`.

## Add your own photos

Tap the **gear** at the bottom left, then **Import photos**. The system photo picker opens and you choose which photos to add (in the picker, the Albums tab lets you open Favourites and select them all). Each photo is placed on the day it was taken, read from its EXIF capture date. A photo with no capture date, such as a screenshot, uses the file's date instead. How many photos were added, skipped or unreadable shows in a toast that disappears after three seconds. Picking the same photo twice is ignored.

- **Everything stays on the device.** Photos are saved in the browser's own storage (IndexedDB) on your phone. Nothing is uploaded, and the import code makes no network requests. The site's code comes from GitHub Pages; your photos never do.
- **Install first, then import.** An installed home-screen app and Safari keep separate storage on iPhone, so add photos from inside the installed app.
- **Remove photos**, in the same gear menu, deletes this app's copies only, never your Photos library.
- **Limits:** iOS can clear a web app's storage if the phone is very low on space, or if you delete the app or clear website data. Keep the originals in Photos. Importing is manual: new photos need another visit to **Add more photos**.
- Code: `src/photo-library/` (storage, date reading, previews, the button strip). Grid cells use small previews; the full-screen viewer loads the original.

## Wallpaper

The calendar sits on a wallpaper. By default it is a frosted wash of peach and light pastel blue, a ready-made image (`public/wallpaper/default.jpg`, drawn once by `npm run default-wallpaper`). In the gear menu, **Set wallpaper** opens the photo picker and uses the photo you choose instead (**Change wallpaper** once one is set), and **Reset wallpaper** brings the default back. The wallpaper is shrunk to screen size and kept on the device like the photos (your photo in the Photos app is never changed). It always fills the whole screen without being stretched: it is scaled until it covers, and whatever does not fit is cropped, so the sides of a square photo run off the edges.

The glass refracts the wallpaper, using Write-With-Nature's liquid glass, so it bends and blurs whatever is behind it. All text adapts to how dark the wallpaper is directly behind it: light text over dark areas, dark text over light areas, chosen separately for the calendar, the day view, the gear menu and the note under the calendar. A soft wash over the glass keeps text readable on busy photos.

## Fast start

The app is meant to look finished on its first frame, with no flash of a different background:

- **The wallpaper is painted before the app loads.** The wallpaper in use is remembered as a tiny blurred preview (about 3 KB) in `localStorage`, which can be read instantly, unlike the full image in IndexedDB. A small script at the top of `index.html` paints it, blurred, together with the status bar tint and the page colour, and the full image fades in over it.
- **Text colours are right from the start.** The wallpaper's average colour is remembered too, so the ink and the readability veil are chosen before the image arrives.
- **Nothing is drawn at launch.** The default wallpaper is a plain image file, and the fonts are hosted with the app (`public/fonts`). The service worker caches both, so they load without the network.
- **No entry animation on the first view,** and full-size photo URLs are made only when a photo is opened, not for the whole library at launch.

Re-draw the default wallpaper with `npm run default-wallpaper` (needs Chrome installed).

## Diagnostics

Press and hold the **info** button for about a second to open a card of screen and page facts: the page's size against the screen's, the safe-area insets, whether it is running as an installed app, and the iOS version. It exists so layout problems that only show on a real phone can be diagnosed from a screenshot. Tap the card to close it.

## Install it as an app (PWA)

The calendar is a progressive web app: installable, full-screen, and usable offline.

- **iPhone / iPad (Safari):** Share, then "Add to Home Screen".
- **Android / desktop Chrome and Edge:** use the install icon in the address bar, or the menu's "Install app".

How it works: `public/manifest.webmanifest` describes the app, `public/sw.js` is the service worker, and `src/pwa/register.js` registers it (production builds only). Every built file is precached, so after one online visit the app opens offline, and photos you imported are already on the device. Each deploy gets a new cache version automatically, and the old one is removed.

The installed app runs full screen, with the wallpaper under the iPhone status bar. iOS reads that setting when the app is added to the Home Screen, so after an update that changes it, delete the app and add it again.

Icons are generated from `public/icons/icon.svg` with `npm run icons` (needs Chrome installed).

## Host it on GitHub Pages

`.github/workflows/pages.yml` builds and deploys on every push to `main`. One-time setup:

1. In the repo on GitHub: **Settings, Pages, Build and deployment, Source: GitHub Actions**.
2. Push to `main`. The site appears at `https://vegamorningstar.github.io/My_Calendar/`.

The build uses relative URLs (`base: './'`), so it works from that project path, from a custom domain, or from any folder, with nothing to configure. To preview the production build locally: `npm run build && npm run preview`.

## Screen sizes

The layout responds to the calendar's own width rather than the screen's, using container queries. On a laptop it is a wide grid with weekday names in each cell; on an iPad it scales down; on an iPhone the header stacks, the year view drops to two columns, and the day view becomes a near full-screen sheet with a two-column photo layout. The page respects the iPhone notch and home indicator when installed.

## Phone on its side

In landscape a phone is wide but short, so the calendar switches to a compact layout that fits the screen with no scrolling: a one-line header with smaller glass buttons, square date boxes sized to the height that is left (the panel is only as wide as seven of them), the gear and info button in a column on the left, the year view as six months across and two down, and a tighter day view. The date boxes are always square, with small gaps, so a photo shows as much of itself as possible, and they are sized to the rows the month has, so a five-row month gets bigger boxes than a six-row one. On any wide, short window (such as a laptop with a small browser window) the whole calendar narrows to keep six rows of square boxes within the height, instead of the boxes shrinking inside wide columns. The rules are in `src/photo-calendar/styles/compact.css` and `src/app.css`.

## What it does

- Month pages with real calendar dates, stepped with the glass arrows or the arrow keys, or by swiping: a finger swipe left or right on a phone, or a two-finger sideways swipe on a laptop trackpad while the pointer is over the calendar (left is next, right is previous; in year view it steps the year).
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

## Notes, ground rules and open discussions

See `NOTES.md`: how we work on this repo, the rules the code follows, and the ideas still being decided (updates that keep your data and backup, a native iOS app, an iPhone widget, and more).
