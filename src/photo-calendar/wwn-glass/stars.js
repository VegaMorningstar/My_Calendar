/**
 * Stand-in for Write-With-Nature's night-sky/stars.js.
 *
 * WWN's backdrop painter calls these after filling the paper colour, to draw the
 * night sky the glass should refract. The calendar has no sky, so here the same
 * hook draws the page's background photo instead (see setBackgroundImage in
 * theme.js). With no photo set, tokens().stars is off and none of this runs.
 *
 * The photo is fitted like CSS `background-size: cover; background-position:
 * center`, so the glass refracts exactly what the page shows.
 */
import { getBackgroundImage, wallpaperBoxScale } from './theme.js'

/** Cover-fitted copies of each photo, by target size, so each frame is one cheap blit. */
const fitted = new WeakMap() // image -> Map('WxH' -> canvas)
const MAX_FITTED = 4

/** The photo cropped to cover a w x h area, cached. */
function coverCanvas(image, w, h) {
  let sizes = fitted.get(image)
  if (!sizes) fitted.set(image, (sizes = new Map()))
  const key = `${Math.round(w)}x${Math.round(h)}`
  let canvas = sizes.get(key)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(w))
    canvas.height = Math.max(1, Math.round(h))
    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
    const dw = image.naturalWidth * scale
    const dh = image.naturalHeight * scale
    canvas.getContext('2d').drawImage(image, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh)
    if (sizes.size >= MAX_FITTED) sizes.delete(sizes.keys().next().value)
    sizes.set(key, canvas)
  }
  return canvas
}

/** Draws the background photo over a w x h backdrop (no-op when there is none). */
export function drawStars(ctx, w, h) {
  const image = getBackgroundImage()
  if (!image || !image.naturalWidth) return
  // The page's wallpaper box is a little taller than the viewport (see WALLPAPER_OVERSCAN_PX in
  // theme.js); fit the photo to that taller box, anchored at the top, so the glass sees the same crop
  const boxH = h * wallpaperBoxScale()
  ctx.drawImage(coverCanvas(image, w, boxH), 0, 0, w, boxH)
}

export const drawBakedStars = drawStars // the photo does not move, so baked and live are the same
export const drawTwinklers = () => {} // nothing animates over a photo
