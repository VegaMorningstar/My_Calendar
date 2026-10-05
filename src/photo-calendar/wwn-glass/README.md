# wwn-glass

Glass code taken from Write-With-Nature (WWN), kept in one folder behind one
entry point, `index.js`. The calendar imports only from that file.

## What is here

| Path | Origin in WWN |
| --- | --- |
| `liquid-glass/` | `src/ui-elements/liquid-glass/` |
| `glass-alphabet/` | `src/ui-elements/glass-alphabet/` (the tile shader the buttons use) |
| `glass-buttons/` | `src/ui-elements/glass-buttons/` |
| `hooks/usePanelGlass.js` | `src/hooks/usePanelGlass.js` |
| `liquid-glass.js` | `src/lib/liquid-glass.js` (the CSS/SVG fallback) |
| `theme.js`, `stars.js` | **Not WWN code.** Small stand-ins, see below |

The WWN files are copies. Apart from the import lines listed below, the removal
of em dashes from comments, and one local addition (below), they are unchanged.

**Local additions:** (1) the tile shader's highlight is faded out over the flat body (`glass-alphabet/scene.ts`, marked `LOCAL CHANGE`), so only the bevel catches it and the middle of the glass stays clear. (2) An optional font family for the text drawn inside glass tiles.
`glass-alphabet/backdrop.js` reads `style.family` and `glass-buttons/GlassButtons.jsx`
passes `material.letterFamily`; both are marked `LOCAL CHANGE`. Left unset, the font is
WWN's Playfair Display exactly as before.

**Local change: draw only when something changed.** The WWN glass redrew every canvas on every frame. Here each scene (`glass-alphabet/scene.ts` for the buttons and date tiles, `liquid-glass/overlay.ts` for panels) compares what its setters are given with the last values (rounded to a millionth, so a spring that has all but settled does not count) and skips the texture upload and the draw when nothing changed. The callers call `scene.invalidate(reason)` when a backdrop canvas was repainted or the canvas was resized. The backdrops repaint only when their inputs changed: the shared panel backdrop (`liquid-glass/backdrop.js`) by a key of size, `theme()` and `contentVersion()`; the tile backdrop (`glass-alphabet/backdrop.js`) by its own position, the page size, `theme()` and `contentVersionIn(rect)`, so a photo fading in the date tiles does not repaint the buttons that are nowhere near it. `theme.js` (ours) holds the counters, and `glass-tiles/photoLayer.js` bumps them with the region the photos touch. A `LiquidGlassPanel` canvas is also resized only when its size changed. `globalThis.__glassStats` counts frames drawn and skipped (shown on the diagnostics card). Any new glass piece must call `invalidate()` when it changes its backdrop or canvas, or it will stay stale.

## The two seams

WWN's glass reaches into the rest of WWN in exactly two places. Everything else
is self-contained.

1. `theme.js`: the shader cannot read the DOM, so it refracts a canvas repainted
   with the page colour. The files call `tokens()` and `theme()` for that.
   - `liquid-glass/backdrop.js`, `glass-alphabet/backdrop.js` and
     `glass-buttons/GlassButtons.jsx` import `../theme.js`.
2. `stars.js`: the night-sky drawing used by WWN's dark theme. Only
   `liquid-glass/backdrop.js` imports it. In the calendar this stand-in draws the
   page's wallpaper instead (turned on by `setBackgroundImage`), so the glass
   refracts the wallpaper through WWN's own hook, with no change to its files.
   Inside WWN you would not need this: its own stars file stays as it is.

The calendar also needs a way to ask "what colour is the page, and tell me when
it changes". That is the `paper` part of the contract below.

## Contract exported by `index.js`

`LiquidGlassPanel`, `PANEL_GLASS`, `usePanelGlass`, `GlassButtons`,
`BUTTON_MATERIAL`, `liquidGlass`, `MATERIAL_DEFAULTS`, and the paper functions
`paperColor()`, `setPaperColor(css)`, `setBackgroundImage(image, averageCss)`, `getBackgroundImage()`, `syncPaperFromBody()`, `onPaperChange(fn)`.

## Using the calendar inside WWN without duplicating this code

Possible today with one thin file, and no calendar changes:

1. Do not copy this folder into WWN. Create `src/photo-calendar/wwn-glass/index.js`
   there instead, re-exporting WWN's own modules under the names above
   (`../../ui-elements/liquid-glass/LiquidGlassPanel.jsx`, and so on).
2. Implement the four paper functions from WWN's theme:
   `paperColor = () => tokens().paperBase`, `onPaperChange = onThemeChange`,
   and no-ops for `setPaperColor` and `syncPaperFromBody`.

What is not solved yet is a single source of truth: today the files exist both in
WWN and here, and only copy-paste keeps them in step. The proper fix is a shared
package (a workspace package or a git submodule) that both repos import, with
`theme` and `stars` injected rather than imported. That is a dedicated cleanup.

## Version pin

`typegpu` must stay at 0.12.4 (with `@typegpu/sdf` and `@typegpu/noise` at 0.12.0 and `unplugin-typegpu` at 0.12.3,
as in WWN). 0.12.6 renders the panel shader black.

**Local change: pure black and white type.** `glass-alphabet/constants.ts` sets the letter inks to `0,0,0` and `255,255,255` (WWN uses a warm near-black and a parchment) and narrows the dark/light switch to a 0.495 to 0.505 luminance band. In `glass-alphabet/scene.ts` the ink is mixed in after the tint is applied to the glass, so the tint no longer shifts the letters' colour. The DOM text follows the same rule (`src/photo-calendar/lib/adaptive-ink.js`).

**Local change: `showPhotos`.** `LiquidGlassPanel` takes `showPhotos` (default true). With it false the panel uses a second shared backdrop (`getSharedBackdrop({ fluid: false })` in `liquid-glass/backdrop.js`) that leaves out the layer drawn over the wallpaper (the day photos of the glass date tiles). The day sheet uses it, because it covers the calendar and the photos would otherwise show through it.

**Local change: `showPhotos` on `GlassButtons`** (default true). With it false the buttons' own backdrop (`createTileBackdrop({ fluid: false })` in `glass-alphabet/backdrop.js`) leaves out the date photos' layer, as `LiquidGlassPanel` does. The day sheet's buttons use it.

**Local change: `ringTint`** (a tile material setting, default 1) in `glass-alphabet/scene.ts` and `GlassButtons.jsx`: how much of the tint reaches the rim of a tile. 0 leaves the rim untinted, so a tinted, frosted button keeps a rim that shows the full colour of what it refracts. The day sheet's buttons use 0, together with `edgeBlurMultiplier: 0`.

**Local change: `ringTintBlend`** (px, a tile material setting, default 0) works with `ringTint`: the tint fades smoothly from `ringTintBlend` inside the rim down to `ringTint` at the rim's outer edge, instead of stopping at a line. Applied to the body and the rim alike in `glass-alphabet/scene.ts`.
