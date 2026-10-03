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
import { paperColor, MATERIAL_DEFAULTS } from '../wwn-glass/index.js'

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
 * `band` defaults to WWN's. Text on a photo passes PHOTO_BAND: a photo's local
 * average is rarely clean light or dark, and WWN's wide band leaves mid-tones
 * with mid-grey type that reads on neither.
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
