# photo-calendar

A month-per-page calendar etched onto a liquid glass panel. Each day shows the photos taken on it.

## Use it

```jsx
import { PhotoCalendar } from './photo-calendar'

<PhotoCalendar photos={['photos/harbour_2026-10-03.webp', 'photos/dusk_2026-10-03.webp']} />
```

| Prop | Default | Meaning |
| --- | --- | --- |
| `photos` | `[]` | URLs ending in `YYYY-MM-DD` or `YYYYMMDD`, or `{ src, date: 'YYYY-MM-DD' }` objects |
| `initialDate` | today | `Date` whose month opens first |
| `weekStartsOn` | `0` | `0` Sunday to `6` Saturday |
| `rotateMs` | `5000` | Average time each photo stays up on a multi-photo day |
| `className` | `''` | Extra class on the root element |

Colours and spacing are CSS variables on `.pc-root` (`styles/base.css`).

## Move it into another project

1. Copy this folder.
2. Install `react`, `react-dom`, `typegpu@0.12.4`, `@typegpu/sdf@0.12.0`, `@typegpu/noise@0.12.0`, and (dev) `unplugin-typegpu@0.12.3`.
3. Add `unplugin-typegpu/vite` to `vite.config.js`, **before** the React plugin: the glass shaders are compiled by it.
4. Load the `Playfair Display` and `DM Mono` fonts (the page in this repo does it from Google Fonts).
5. If the page colour changes after load, call `setPaperColor('#...')`; if the page has a photo or image as its background, call `setBackgroundImage(image, averageCss)` (an `HTMLImageElement` that is already decoded, and its average colour). The glass then refracts that instead of a flat colour.

Browsers without WebGPU get a CSS glass fallback automatically.

## Structure

```
index.js              public API, import from here only
PhotoCalendar.jsx     wires the pieces together
components/           CalendarHeader, MonthView, DayCell, YearView, DayDetail
hooks/                useCalendarView, usePhotoRotation, usePhotoInk, usePageInk
lib/                  dates (calendar maths, filename parsing), adaptive-ink, glass-config
styles/               base, month, year, detail
wwn-glass/            Write-With-Nature glass code behind one entry point (own README)
```

## Behaviour notes

- **Random rotation:** each day draws its own random start and jittered waits, so photos never change in unison.
- **Glass kit:** `index.js` also exports `GlassButtons`, `LiquidGlassPanel`, `PANEL_GLASS`, `usePanelGlass`, `BUTTON_MATERIAL`, so other UI (the settings gear and menu) can use the same glass.
- **Adaptive ink:** `usePageInk(ref)` measures the wallpaper under the element it is given, so each block of text follows what is directly behind it.
- **Adaptive ink (photos and glass):** text colour follows WWN's rule (luminance of what is behind, smoothstepped between a dark and a light ink). Text on photos uses a narrower band, because photo patches are rarely cleanly light or dark.
- **Day view:** a portal to `<body>`. Esc, the burgundy X or a click on the veil closes it, and focus returns to the day that opened it. Arrow keys, a swipe or the arrow buttons step to the previous or next day that has photos (the month behind follows).
- **Photo viewer:** zoom (double-tap, pinch, trackpad, `+` `-` `0`), pan, swipe between photos, swipe down to close, tap to hide the buttons. The transform is written straight to the element during a gesture, not through React state.
- **Keys:** left and right arrows step, Esc or `y` zoom between month and year (paused while the day view is open).
