/**
 * The layer that puts the day photos inside the glass date tiles.
 *
 * The tile shader cannot see the page: it refracts a canvas that WWN's backdrop painter fills with
 * the wallpaper. That painter also lays one extra canvas over the wallpaper, found by the id
 * 'fluid-cursor-canvas' (in WWN it carries the fluid cursor). The calendar has no fluid cursor, so
 * it uses the same hook for the photos: this canvas covers the viewport, each frame the photos are
 * drawn into it at the tiles' positions, and the glass then bends them at the tile edges like any
 * other background. Hidden from the page itself; it is only ever read by the painters.
 */

import { bumpContent } from '../wwn-glass/theme.js'

let layer = null
let lastSignature = ''
let lastBox = null // where the photos were drawn last time
/** Margin (px) added around the photos, for the glass rim that bends them. */
const PAD = 16

/** The photo layer, created on first use. */
function getLayer() {
  if (!layer) {
    layer = document.createElement('canvas')
    layer.id = 'fluid-cursor-canvas'
    layer.setAttribute('aria-hidden', 'true')
    layer.style.display = 'none'
    document.body.appendChild(layer)
  }
  return layer
}

/** Removes the layer, so the painters stop compositing photos. */
export function removePhotoLayer() {
  layer?.remove()
  layer = null
  lastSignature = ''
  lastBox = null
  bumpContent()
}

/** Draws `img` cropped to cover the rectangle, like CSS object-fit: cover. */
function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/**
 * Repaints the layer.
 * @param {{x:number, y:number, w:number, h:number, r:number, layers:{img:HTMLImageElement, alpha:number}[]}[]} tiles
 *   in viewport CSS px; `layers` are drawn in order, so a crossfade is two layers with alphas
 */
export function paintPhotoLayer(tiles) {
  // Repainted only when something about the photos changed (a tile moved, a photo swapped, a crossfade moved on);
  // otherwise the layer is left alone, and the glass (which compares this) is not asked to redraw
  const signature = `${window.innerWidth}x${window.innerHeight}|` + tiles
    .filter(t => t.layers.length)
    .map(t => [t.x.toFixed(1), t.y.toFixed(1), t.w.toFixed(1), t.h.toFixed(1), t.r, t.layers.map(l => `${l.img.currentSrc || l.img.src}@${l.alpha.toFixed(3)}`).join('+')].join(','))
    .join(';')
  if (signature === lastSignature) return
  lastSignature = signature
  // Tell the glass where the photos are (now and just before), so only what sits over them redraws
  const here = tiles.filter(t => t.layers.length)
  const box = here.length
    ? { x0: Math.min(...here.map(t => t.x)) - PAD, y0: Math.min(...here.map(t => t.y)) - PAD, x1: Math.max(...here.map(t => t.x + t.w)) + PAD, y1: Math.max(...here.map(t => t.y + t.h)) + PAD }
    : null
  const union = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) })
  const region = union(box, lastBox)
  lastBox = box
  bumpContent(region ?? undefined)
  const canvas = getLayer()
  const scale = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(window.innerWidth * scale)
  const h = Math.round(window.innerHeight * scale)
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  const ctx = canvas.getContext('2d')
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  for (const t of tiles) {
    if (!t.layers.length) continue
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(t.x, t.y, t.w, t.h, t.r)
    ctx.clip()
    for (const { img, alpha } of t.layers) {
      ctx.globalAlpha = alpha
      drawCover(ctx, img, t.x, t.y, t.w, t.h)
    }
    ctx.restore()
  }
}
