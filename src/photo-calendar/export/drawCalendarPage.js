/**
 * Paints the calendar page onto a canvas: the wallpaper, the month's name, the weekday labels and a box for every day,
 * each box holding the photo chosen for that day.
 *
 * It paints at any size: the layout is in page pixels (pageLayout.js) and `scale` shrinks it, so a small preview and the
 * full 300 dpi file are the same picture. Text is pure black or pure white, chosen from the brightness of what is behind
 * it, like everywhere else in the app.
 */
import { cssColorLuma, luma } from '../lib/adaptive-ink.js'
import { MONTHS } from '../lib/dates.js'
import { pageLayout } from './pageLayout.js'

const SERIF = "'Playfair Display', Georgia, serif"
const MONO = "'DM Mono', ui-monospace, monospace"

/** Resolves once the fonts the page uses are loaded, so the canvas does not paint in a fallback face. */
export function loadCalendarFonts() {
  if (!document.fonts?.load) return Promise.resolve()
  return Promise.all([
    document.fonts.load(`600 64px ${SERIF}`),
    document.fonts.load(`italic 400 64px ${SERIF}`),
    document.fonts.load(`400 40px ${MONO}`),
  ]).then(() => undefined, () => undefined)
}

/** Source rectangle that makes an image cover a w x h box without stretching (like CSS object-fit: cover). */
function coverSource(image, w, h) {
  const k = Math.max(w / image.naturalWidth, h / image.naturalHeight)
  const sw = w / k
  const sh = h / k
  return [(image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh]
}

/** Draws `image` covering the box, clipped to it. */
function drawCover(ctx, image, x, y, w, h) {
  const [sx, sy, sw, sh] = coverSource(image, w, h)
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h)
}

const DARK = { ink: '#000', hi: '#fff' }
const LIGHT = { ink: '#fff', hi: '#000' }
/** Pure black on a bright background, pure white on a dark one. */
const inkFor = l => (l >= 0.5 ? DARK : LIGHT)

// A small copy of the wallpaper as it sits on the page, to read the brightness behind any rectangle
const samplers = new WeakMap()
function wallpaperLuma(wallpaper, paper, W, H) {
  if (!wallpaper) {
    const flat = cssColorLuma(paper)
    return () => flat
  }
  let bySize = samplers.get(wallpaper)
  if (!bySize) samplers.set(wallpaper, (bySize = new Map()))
  const key = `${W}x${H}`
  if (!bySize.has(key)) {
    const sw = 96
    const sh = Math.max(1, Math.round((sw * H) / W))
    const c = document.createElement('canvas')
    c.width = sw
    c.height = sh
    const g = c.getContext('2d', { willReadFrequently: true })
    drawCover(g, wallpaper, 0, 0, sw, sh)
    const data = g.getImageData(0, 0, sw, sh).data
    bySize.set(key, rect => {
      const x0 = Math.max(0, Math.floor((rect.x / W) * sw))
      const x1 = Math.min(sw, Math.max(x0 + 1, Math.ceil(((rect.x + rect.w) / W) * sw)))
      const y0 = Math.max(0, Math.floor((rect.y / H) * sh))
      const y1 = Math.min(sh, Math.max(y0 + 1, Math.ceil(((rect.y + rect.h) / H) * sh)))
      let sum = 0
      let n = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const o = (y * sw + x) * 4
        sum += luma(data[o], data[o + 1], data[o + 2])
        n++
      }
      return n ? sum / n : 0.5
    })
  }
  return bySize.get(key)
}

/** Rounded-rectangle path (a path of its own, so callers can fill, stroke or clip it). */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} o
 * @param {number} o.W  page width in page pixels
 * @param {number} o.H  page height in page pixels
 * @param {number} [o.scale]  canvas pixels per page pixel (1 for the full-size file)
 * @param {number} o.year
 * @param {number} o.month  zero-based
 * @param {number} [o.weekStartsOn]
 * @param {HTMLImageElement|null} o.wallpaper  the page's wallpaper, or null for the plain page colour
 * @param {string} o.paper  the plain page colour (CSS), used behind the wallpaper and when there is none
 * @param {(day:number) => HTMLImageElement|null} o.photoFor  the photo chosen for a day, loaded, or null for none
 * @returns {object} the layout used (see pageLayout)
 */
export function drawCalendarPage(ctx, { W, H, scale = 1, year, month, weekStartsOn = 0, wallpaper, paper, photoFor }) {
  const L = pageLayout(W, H, year, month, weekStartsOn)
  const lumaAt = wallpaperLuma(wallpaper, paper, W, H)

  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.imageSmoothingQuality = 'high'

  // The wallpaper, covering the page
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)
  if (wallpaper) drawCover(ctx, wallpaper, 0, 0, W, H)

  // Title: the month, and the year beside it
  const titleInk = inkFor(lumaAt({ x: L.title.x, y: L.margin, w: L.title.size * 8, h: L.title.size * 1.2 }))
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = titleInk.ink
  ctx.font = `600 ${L.title.size}px ${SERIF}`
  ctx.fillText(MONTHS[month], L.title.x, L.title.baseline)
  const nameW = ctx.measureText(MONTHS[month]).width
  ctx.font = `italic 400 ${L.title.yearSize}px ${SERIF}`
  ctx.fillText(String(year), L.title.x + nameW + L.title.size * 0.28, L.title.baseline)

  // Weekday labels
  const weekInk = inkFor(lumaAt({ x: L.week.left, y: L.week.top, w: L.week.width, h: L.week.h }))
  ctx.fillStyle = weekInk.ink
  ctx.font = `400 ${L.week.size}px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const { label, cx } of L.week.labels) ctx.fillText(label, cx, L.week.top + L.week.h / 2)

  // One box per day
  const line = Math.max(1, L.S * 0.0018)
  for (const t of L.tiles) {
    const photo = photoFor(t.day)
    const numX = t.x + L.numPad
    const numY = t.y + L.numPad + L.numSize * 0.78
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `600 ${L.numSize}px ${SERIF}`

    if (photo) {
      // A soft shadow under the photo, then the photo itself clipped to the rounded box, then a pale edge
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,.3)'
      ctx.shadowBlur = L.S * 0.009 * scale
      ctx.shadowOffsetY = L.S * 0.003 * scale
      ctx.fillStyle = '#000'
      roundRect(ctx, t.x, t.y, t.w, t.h, L.radius)
      ctx.fill()
      ctx.restore()
      ctx.save()
      roundRect(ctx, t.x, t.y, t.w, t.h, L.radius)
      ctx.clip()
      drawCover(ctx, photo, t.x, t.y, t.w, t.h)
      ctx.restore()
      ctx.strokeStyle = 'rgba(255,255,255,.65)'
      ctx.lineWidth = line
      roundRect(ctx, t.x, t.y, t.w, t.h, L.radius)
      ctx.stroke()

      // The number's colour comes from the picture under it, read back from what was just painted
      let numLuma = 0.3
      try {
        const px = ctx.getImageData(
          Math.round(t.x * scale), Math.round(t.y * scale),
          Math.max(1, Math.round(L.numSize * 2.2 * scale)), Math.max(1, Math.round(L.numSize * 1.8 * scale)),
        ).data
        let sum = 0
        for (let i = 0; i < px.length; i += 4) sum += luma(px[i], px[i + 1], px[i + 2])
        numLuma = sum / (px.length / 4)
      } catch { /* an unreadable picture: keep white */ }
      const ink = inkFor(numLuma)
      ctx.save()
      ctx.shadowColor = ink.hi === '#fff' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.55)'
      ctx.shadowBlur = L.S * 0.0025 * scale
      ctx.shadowOffsetY = L.S * 0.001 * scale
      ctx.fillStyle = ink.ink
      ctx.fillText(String(t.day), numX, numY)
      ctx.restore()
    } else {
      // An empty box: a faint wash, a hairline edge, the number in the ink that suits the wallpaper behind it
      const ink = inkFor(lumaAt(t))
      ctx.fillStyle = ink.hi === '#fff' ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.14)'
      roundRect(ctx, t.x, t.y, t.w, t.h, L.radius)
      ctx.fill()
      ctx.strokeStyle = ink.ink === '#000' ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.3)'
      ctx.lineWidth = line
      roundRect(ctx, t.x, t.y, t.w, t.h, L.radius)
      ctx.stroke()
      ctx.fillStyle = ink.ink
      ctx.fillText(String(t.day), numX, numY)
    }
  }

  ctx.restore()
  return L
}
