/**
 * The page wallpaper: a photo the user picks, shrunk to screen size and kept on
 * the device.
 *
 * It is stored as a JPEG no larger than MAX_SIDE px, with its average colour
 * beside it. The average is what the calendar's text colours are chosen against,
 * so they stay readable over any photo.
 *
 * The full image lives in IndexedDB, which is asynchronous, so it cannot be painted
 * on the first frame. A small "hint" is therefore also kept in localStorage, which
 * can be read instantly: a tiny blurred preview (a few KB), the average colour and
 * the colours of the top and bottom edges. The page paints the preview straight
 * away (see the script in index.html) and the full image fades in over it.
 */
import { deleteSetting, getSetting, putSetting } from './photo-store.js'

const KEY = 'wallpaper'
/** localStorage key of the hint. index.html reads the same key. */
const HINT_KEY = 'mycal.wallpaper'
/** Width of the preview in px: it is blurred anyway, and small keeps it to a few KB. */
const PREVIEW_W = 48
/** Longest side of the stored wallpaper, in px. Plenty for a phone or a laptop screen. */
const MAX_SIDE = 2400
/** The average is taken over the middle of the photo, where the calendar sits. */
const AVERAGE_GRID = 32
const AVERAGE_CENTRE = [0.2, 0.8]

/**
 * Shrinks a picked photo and measures its average colour.
 * @param {File} file
 * @returns {Promise<{ blob: Blob, average: {r:number,g:number,b:number} }>}
 */
export async function prepareWallpaper(file) {
  // createImageBitmap applies the photo's rotation, so portraits stay upright
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  const small = document.createElement('canvas')
  small.width = small.height = AVERAGE_GRID
  const sctx = small.getContext('2d', { willReadFrequently: true })
  sctx.drawImage(bitmap, 0, 0, AVERAGE_GRID, AVERAGE_GRID)
  bitmap.close()
  const [lo, hi] = AVERAGE_CENTRE.map(f => Math.round(f * AVERAGE_GRID))
  const px = sctx.getImageData(lo, lo, hi - lo, hi - lo).data
  let r = 0, g = 0, b = 0
  for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2] }
  const n = px.length / 4

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86))
  if (!blob) throw new Error('Could not encode the wallpaper')
  const average = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
  return { blob, average, preview: makePreview(canvas) }
}

/** A tiny JPEG data URL of a canvas or a loaded image, keeping its proportions. */
function makePreview(source) {
  const sw = source.naturalWidth || source.width
  const sh = source.naturalHeight || source.height
  const small = document.createElement('canvas')
  small.width = PREVIEW_W
  small.height = Math.min(96, Math.max(16, Math.round((PREVIEW_W * sh) / sw)))
  small.getContext('2d').drawImage(source, 0, 0, small.width, small.height)
  return small.toDataURL('image/jpeg', 0.7)
}

/** A preview of an already loaded image, for a wallpaper whose hint has gone missing. */
export const previewOf = makePreview

/** The remembered hint, or null: { preview, average, top?, bottom? }. Read synchronously. */
export function readWallpaperHint() {
  try { return JSON.parse(localStorage.getItem(HINT_KEY)) } catch { return null }
}

/** Remembers (or updates) the hint. Storage can be unavailable (private mode), and that is fine. */
export function writeWallpaperHint(partial) {
  try { localStorage.setItem(HINT_KEY, JSON.stringify({ ...readWallpaperHint(), ...partial })) } catch { /* no storage */ }
}

/** Forgets the hint, so the next launch shows the default wallpaper. */
export function clearWallpaperHint() {
  try { localStorage.removeItem(HINT_KEY) } catch { /* no storage */ }
}

/** Saves the wallpaper, replacing any earlier one. */
export const saveWallpaper = record => putSetting(KEY, record)

/** The saved wallpaper, { blob, average }, or undefined. */
export const loadWallpaper = () => getSetting(KEY)

/** Deletes the saved wallpaper. */
export const removeWallpaper = () => deleteSetting(KEY)
