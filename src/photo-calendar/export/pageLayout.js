/**
 * Where everything goes on the exported calendar page: the title, the weekday labels and one box per day.
 *
 * Pure arithmetic, no drawing, so the same numbers place the picture on the screen (the preview) and in the saved file.
 * Everything is in page pixels; the drawing scales them to whatever size it paints at.
 */
import { monthCells, weekdayLabels } from '../lib/dates.js'

/** Page sizes in pixels: US Letter (11 x 8.5 inches) at 300 dpi, in both orientations. */
export const PAGE_SIZES = {
  landscape: { w: 3300, h: 2550 },
  portrait: { w: 2550, h: 3300 },
}

/**
 * @param {number} W  page width
 * @param {number} H  page height
 * @param {number} year
 * @param {number} month  zero-based
 * @param {number} [weekStartsOn]  0 = Sunday
 */
export function pageLayout(W, H, year, month, weekStartsOn = 0) {
  const cells = monthCells(year, month, weekStartsOn)
  const rows = Math.ceil(cells.length / 7)
  const S = Math.min(W, H) // the short side: type and margins are fractions of it, so both orientations look alike
  const landscape = W >= H

  const margin = Math.round(S * (landscape ? 0.065 : 0.075))
  const gap = Math.round(S * 0.011)
  const fullW = W - 2 * margin

  // Header: the month's name, the year beside it, then the weekday labels
  const titleSize = Math.round(S * 0.088)
  const yearSize = Math.round(S * 0.042)
  const weekSize = Math.round(S * 0.022)
  const titleBaseline = margin + titleSize * 0.82
  let weekTop = margin + titleSize * 1.25
  const weekH = weekSize * 2.2

  // The boxes are squares (upright phone photos are cropped far less in a square than in a wide box), as big as the page lets
  // them be: seven across the full width, or fewer pixels if the rows would not fit in the height that is left. The grid is
  // centred, and the title lines up with its left edge.
  const gridTop0 = weekTop + weekH + gap * 0.5
  const availH = H - margin - gridTop0
  const side = Math.min((fullW - 6 * gap) / 7, (availH - (rows - 1) * gap) / rows)
  const tileW = side
  const tileH = side
  const gridW = 7 * side + 6 * gap
  const gridX = (W - gridW) / 2
  const blockH = rows * side + (rows - 1) * gap

  // An upright page has room to spare below the grid: the weekday labels and the grid sit at the bottom of the page and the
  // wallpaper shows between them and the title. A landscape page is filled, so nothing is left to move.
  const free = Math.max(0, availH - blockH)
  weekTop += free
  const gridY = gridTop0 + free

  const tiles = []
  cells.forEach((day, i) => {
    if (day == null) return
    const col = i % 7
    const row = Math.floor(i / 7)
    tiles.push({ day, x: gridX + col * (side + gap), y: gridY + row * (side + gap), w: side, h: side })
  })

  return {
    W, H, S, rows, margin, gap, tileW, tileH,
    radius: Math.min(tileW, tileH) * 0.11,
    numSize: Math.min(tileW, tileH) * 0.2,
    numPad: Math.min(tileW, tileH) * 0.09,
    title: { x: gridX, baseline: titleBaseline, size: titleSize, yearSize },
    week: {
      top: weekTop, h: weekH, size: weekSize, left: gridX, width: gridW,
      labels: weekdayLabels(weekStartsOn).map((label, col) => ({ label, cx: gridX + col * (side + gap) + side / 2 })),
    },
    tiles,
  }
}
