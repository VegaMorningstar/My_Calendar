/**
 * The page wallpaper: a photo the user picks, shrunk to screen size and kept on
 * the device.
 *
 * It is stored as a JPEG no larger than MAX_SIDE px, with its average colour
 * beside it. The average is what the calendar's text colours are chosen against,
 * so they stay readable over any photo.
 */
import { deleteSetting, getSetting, putSetting } from './photo-store.js'

const KEY = 'wallpaper'
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
  return { blob, average: { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) } }
}

/** Saves the wallpaper, replacing any earlier one. */
export const saveWallpaper = record => putSetting(KEY, record)

/** The saved wallpaper, { blob, average }, or undefined. */
export const loadWallpaper = () => getSetting(KEY)

/** Deletes the saved wallpaper. */
export const removeWallpaper = () => deleteSetting(KEY)
