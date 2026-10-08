/**
 * Imports photos the user picked: reads each one's capture date, makes a
 * preview, and stores it on the device. Photos already imported are skipped.
 */
import { captureDate } from './exif-date.js'
import { makeThumbnail } from './thumbnail.js'
import { hasPhoto, putPhoto } from './photo-store.js'

/**
 * @param {File[]} files
 * @param {(done:number, total:number) => void} [onProgress]
 * @param {{date?: string}} [options]  `date` ('YYYY-MM-DD') puts every photo on that day whatever its own capture date says (the photos
 *   were chosen for a particular day, for example today's tile)
 * @returns {Promise<{ added:number, skipped:number, failed:number, dated:number, undated:number, dates:string[] }>}
 *   `undated` counts photos with no capture date that fell back to the file date; `dates` are the days ('YYYY-MM-DD') the added photos landed on
 */
export async function importFiles(files, onProgress, options = {}) {
  const result = { added: 0, skipped: 0, failed: 0, dated: 0, undated: 0, dates: [] }
  const images = files.filter(f => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name))
  result.failed += files.length - images.length

  // One at a time on purpose: decoding several large photos at once can run a phone out of memory
  for (let i = 0; i < images.length; i++) {
    const file = images[i]
    try {
      const found = await captureDate(file)
      const date = options.date ?? found.date
      const source = options.date ? 'chosen' : found.source
      // Same name, size and day means the same photo picked again
      const id = `${file.name}|${file.size}|${date}`
      if (await hasPhoto(id)) {
        result.skipped++
      } else {
        const thumb = await makeThumbnail(file)
        await putPhoto({ id, name: file.name, size: file.size, date, blob: file, thumb })
        result.added++
        result.dates.push(date)
        // A photo just taken with the camera has no metadata to read in the page's own camera, but its date is certain: now
        if (source === 'exif' || source === 'chosen' || /^camera-/.test(file.name)) result.dated++
        else result.undated++
      }
    } catch {
      result.failed++
    }
    onProgress?.(i + 1, images.length)
  }
  return result
}
