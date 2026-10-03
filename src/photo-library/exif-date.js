/**
 * Works out which calendar day a photo was taken.
 *
 * The camera writes the capture time into the photo's EXIF metadata as plain
 * local time ("2026:10:03 14:22:05"). That string is used as it is, never
 * converted through a timezone, so a photo lands on the day it was shot.
 * `exifr` reads JPEG and HEIC, which covers what an iPhone produces.
 *
 * If a photo has no capture date (screenshots, edited exports), the file's
 * modified time is used instead, and the result says so.
 */
import { parse } from 'exifr/dist/lite.esm.mjs'

const pad = n => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' from an EXIF "YYYY:MM:DD ..." string, or null if it is not a real date. */
function fromExifString(raw) {
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(String(raw ?? ''))
  if (!m) return null
  const [y, mo, d] = [+m[1], +m[2] - 1, +m[3]]
  const check = new Date(y, mo, d)
  const real = check.getFullYear() === y && check.getMonth() === mo && check.getDate() === d
  return real && y >= 1990 ? `${m[1]}-${m[2]}-${m[3]}` : null
}

/**
 * @param {File} file
 * @returns {Promise<{ date: string, source: 'exif' | 'file' }>}
 */
export async function captureDate(file) {
  try {
    // reviveValues: false keeps the raw string. The default builds a Date and shifts it
    // by the timezone, which can move a late-night photo to the next day. (Combining
    // reviveValues: false with `pick` throws in exifr 7.1.3, hence no `pick` here.)
    const tags = await parse(file, { exif: true, reviveValues: false })
    const date = fromExifString(tags?.DateTimeOriginal) ?? fromExifString(tags?.CreateDate)
    if (date) return { date, source: 'exif' }
  } catch { /* no readable metadata: fall through to the file date */ }

  const d = new Date(file.lastModified || Date.now())
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, source: 'file' }
}
