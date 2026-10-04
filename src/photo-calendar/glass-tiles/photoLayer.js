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

let layer = null

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
