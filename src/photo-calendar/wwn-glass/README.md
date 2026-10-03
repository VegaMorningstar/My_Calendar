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

The WWN files are copies. Apart from the import lines listed below, and the
removal of em dashes from comments, they are unchanged.

## The two seams

WWN's glass reaches into the rest of WWN in exactly two places. Everything else
is self-contained.

1. `theme.js`: the shader cannot read the DOM, so it refracts a canvas repainted
   with the page colour. The files call `tokens()` and `theme()` for that.
   - `liquid-glass/backdrop.js`, `glass-alphabet/backdrop.js` and
     `glass-buttons/GlassButtons.jsx` import `../theme.js`.
2. `stars.js`: the night-sky drawing used by the dark theme. Only
   `liquid-glass/backdrop.js` imports it, and the calendar never turns it on.

The calendar also needs a way to ask "what colour is the page, and tell me when
it changes". That is the `paper` part of the contract below.

## Contract exported by `index.js`

`LiquidGlassPanel`, `PANEL_GLASS`, `usePanelGlass`, `GlassButtons`,
`BUTTON_MATERIAL`, `liquidGlass`, `MATERIAL_DEFAULTS`, and the paper functions
`paperColor()`, `setPaperColor(css)`, `syncPaperFromBody()`, `onPaperChange(fn)`.

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
