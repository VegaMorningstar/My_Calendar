/**
 * The default wallpaper: a frosted wash of purple, blue, orange and yellow,
 * drawn on a canvas so there is no image file to ship.
 *
 * It goes through exactly the same path as a photo the user picks: the page shows
 * it, the glass refracts it, and the text colours are chosen against it.
 *
 * Rich, soft colour fields, a light haze over the middle and a fine grain give the
 * frosted look. The colours sit near the corners so a phone (tall, so the sides are
 * cropped) and a laptop (wide) both show all four.
 */

/** Size of the square canvas, in px. The page crops it to cover the screen. */
const SIZE = 1400

/** [centre x, centre y, radius] as fractions of SIZE, and the colour (r, g, b). */
const FIELDS = [
  [0.2, 0.22, 0.7, [140, 80, 245]], // purple, top left
  [0.82, 0.2, 0.62, [45, 130, 255]], // blue, top right
  [0.22, 0.82, 0.66, [255, 118, 40]], // orange, bottom left
  [0.82, 0.8, 0.6, [255, 204, 35]], // yellow, bottom right
]
const BASE = '#e4d8fb'

let cached = null

/** A tile of random grey noise, repeated over the canvas as the frosted grain. */
function grainPattern(ctx) {
  const tile = document.createElement('canvas')
  tile.width = tile.height = 160
  const tctx = tile.getContext('2d')
  const img = tctx.createImageData(160, 160)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + Math.random() * 165
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  tctx.putImageData(img, 0, 0)
  return ctx.createPattern(tile, 'repeat')
}

/**
 * @returns {{ url: string, averageCss: string }} a JPEG data URL, and the average
 *   colour of its middle, where the calendar sits. Generated once, then reused.
 */
export function makeDefaultWallpaper() {
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  ctx.fillStyle = BASE
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Four colour fields, each fading to nothing, blending where they meet
  for (const [cx, cy, radius, [r, g, b]] of FIELDS) {
    const x = cx * SIZE
    const y = cy * SIZE
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * SIZE)
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`)
    grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.62)`)
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, SIZE, SIZE)
  }

  // Frost: a pale haze, brighter in the middle, then fine grain
  const haze = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE * 0.6)
  haze.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
  haze.addColorStop(1, 'rgba(255, 255, 255, 0.03)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.globalCompositeOperation = 'soft-light'
  ctx.globalAlpha = 0.22
  ctx.fillStyle = grainPattern(ctx)
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  // Average colour of the middle 60%, for the text colours
  const lo = Math.round(SIZE * 0.2)
  const span = Math.round(SIZE * 0.6)
  const small = document.createElement('canvas')
  small.width = small.height = 24
  const sctx = small.getContext('2d', { willReadFrequently: true })
  sctx.drawImage(canvas, lo, lo, span, span, 0, 0, 24, 24)
  const px = sctx.getImageData(0, 0, 24, 24).data
  let r = 0, g = 0, b = 0
  for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2] }
  const n = px.length / 4

  cached = {
    url: canvas.toDataURL('image/jpeg', 0.88),
    averageCss: `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`,
  }
  return cached
}
