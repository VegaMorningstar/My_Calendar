/**
 * Adaptive ink for the DOM text, using Write-With-Nature's rule.
 *
 * WWN's glass buttons pick their glyph colour in the shader: Rec. 709 luminance
 * of what is behind the letter, then a smoothstep across a band (inkLumLo ..
 * inkLumHi) between a dark ink and a light ink. It is a band, not a threshold,
 * so the change is gradual rather than a snap. Plain text can't read the shader,
 * so this applies the same rule to a luminance we measure: the page colour for
 * text on the glass, a sampled region of the photo for text on a photo.
 */
import { getBackgroundImage, paperColor, MATERIAL_DEFAULTS } from '../wwn-glass/index.js'

const m = MATERIAL_DEFAULTS
const DARK = [m.letterR, m.letterG, m.letterB]
const LIGHT = [m.letterLightR, m.letterLightG, m.letterLightB]

const smoothstep = (lo, hi, x) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)))
  return t * t * (3 - 2 * t)
}

/** Luminance of 0-255 sRGB values, in the same space the shader reads. */
export const luma = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

/**
 * { ink, halo } as 'r, g, b' strings: the text colour, and its opposite for etching.
 * `band` defaults to WWN's wide band, which suits glyphs drawn by the shader. DOM text
 * over photos and wallpapers passes PHOTO_BAND instead: the local background is
 * rarely cleanly light or dark, and WWN's wide band leaves mid-tones with mid-grey
 * type that reads on neither.
 */
export const PHOTO_BAND = [0.4, 0.5]
export function inkFor(lum, band = [m.inkLumLo, m.inkLumHi]) {
  const t = smoothstep(band[0], band[1], lum) // 0 = dark behind, 1 = bright behind
  const mix = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(', ')
  return { ink: mix(LIGHT, DARK), halo: mix(DARK, LIGHT) }
}

/** Luminance of any CSS colour, via a 1px canvas so every format works. */
export function cssColorLuma(css) {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const x = c.getContext('2d', { willReadFrequently: true })
  x.fillStyle = css
  x.fillRect(0, 0, 1, 1)
  const [r, g, b] = x.getImageData(0, 0, 1, 1).data
  return luma(r, g, b)
}

// Where each piece of text sits in a day cell, as [x0, y0, x1, y1] of a 32x32 sample.
const REGIONS = { num: [0, 0, 14, 11], dow: [0, 21, 15, 32], badge: [15, 21, 32, 32] }
const N = 32
const cache = new Map()

/**
 * Luminance behind each piece of text for one photo, as drawn in the cell
 * (square, object-fit: cover). Resolves null if the image can't be read, such as
 * a cross-origin photo without CORS headers (it taints the canvas); callers keep their default ink.
 */
export function photoLuma(src) {
  // Photos with transparency show the page through them, so they are sampled over it.
  const paper = paperColor()
  const key = `${paper}|${src}`
  if (!cache.has(key)) {
    cache.set(key, new Promise(resolve => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = c.height = N
          const x = c.getContext('2d', { willReadFrequently: true })
          x.fillStyle = paper
          x.fillRect(0, 0, N, N)
          const s = Math.min(img.naturalWidth, img.naturalHeight)
          x.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, N, N)
          const px = x.getImageData(0, 0, N, N).data
          const out = {}
          for (const [k, [x0, y0, x1, y1]] of Object.entries(REGIONS)) {
            let sum = 0, n = 0
            for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
              const o = (j * N + i) * 4
              sum += luma(px[o], px[o + 1], px[o + 2]); n++
            }
            out[k] = sum / n
          }
          resolve(out)
        } catch { resolve(null) }
      }
      img.onerror = () => resolve(null)
      img.src = src
    }))
  }
  return cache.get(key)
}

// ── Luminance of what is behind a piece of the UI ───────────────────────────────
// The wallpaper is fixed to the viewport and cover-fitted, so a low-resolution
// copy of the viewport is enough to read the brightness under any rectangle.

/** Width in px of the sampled copy of the viewport; the height follows the aspect ratio. */
const SAMPLE_W = 96
let viewportSample = { key: '', w: 0, h: 0, data: null }

/** Pixels of the wallpaper as it appears in the viewport, cover-fitted, at low resolution. */
function sampleViewport(image) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const key = `${image.src}|${vw}x${vh}`
  if (viewportSample.key === key) return viewportSample
  const w = SAMPLE_W
  const h = Math.max(1, Math.round((SAMPLE_W * vh) / vw))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight)
  const dw = image.naturalWidth * scale
  const dh = image.naturalHeight * scale
  ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh)
  viewportSample = { key, w, h, data: ctx.getImageData(0, 0, w, h).data }
  return viewportSample
}

/**
 * Brightness (0 to 1) of what is directly behind `rect` (a viewport rectangle).
 * With a wallpaper, that is the average over the part of the photo under the
 * rectangle; without one, it is the page colour. With no rectangle, the whole screen.
 */
export function backdropLuma(rect) {
  const image = getBackgroundImage()
  if (!image || !image.naturalWidth) return cssColorLuma(paperColor())
  const { w, h, data } = sampleViewport(image)
  const vw = window.innerWidth
  const vh = window.innerHeight
  const x0 = Math.max(0, Math.floor(((rect?.left ?? 0) / vw) * w))
  const x1 = Math.min(w, Math.max(x0 + 1, Math.ceil(((rect?.right ?? vw) / vw) * w)))
  const y0 = Math.max(0, Math.floor(((rect?.top ?? 0) / vh) * h))
  const y1 = Math.min(h, Math.max(y0 + 1, Math.ceil(((rect?.bottom ?? vh) / vh) * h)))
  let sum = 0
  let n = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * w + x) * 4
      sum += luma(data[o], data[o + 1], data[o + 2])
      n++
    }
  }
  return n ? sum / n : cssColorLuma(paperColor())
}

/**
 * Average colour of what is behind `rect` (a viewport rectangle) as a CSS string: the
 * wallpaper's average there, or the page colour when there is no wallpaper.
 */
export function backdropColor(rect) {
  const image = getBackgroundImage()
  if (!image || !image.naturalWidth) return paperColor()
  const { w, h, data } = sampleViewport(image)
  const vw = window.innerWidth
  const vh = window.innerHeight
  const x0 = Math.max(0, Math.floor(((rect?.left ?? 0) / vw) * w))
  const x1 = Math.min(w, Math.max(x0 + 1, Math.ceil(((rect?.right ?? vw) / vw) * w)))
  const y0 = Math.max(0, Math.floor(((rect?.top ?? 0) / vh) * h))
  const y1 = Math.min(h, Math.max(y0 + 1, Math.ceil(((rect?.bottom ?? vh) / vh) * h)))
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * w + x) * 4
      r += data[o]; g += data[o + 1]; b += data[o + 2]; n++
    }
  }
  return n ? `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})` : paperColor()
}

/** The colour along the very top edge of the screen: what the status bar should blend into. */
export const topEdgeColor = () => backdropColor({ left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight * 0.04 })
