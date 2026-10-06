/**
 * Renders the calendar page at full size and hands it to the person.
 *
 * What is saved is the whole page, as a PNG or as a PDF (the person chooses after pressing Save): US Letter at about 400 dpi (4400 x 3400 pixels on a landscape page), or at 300 dpi
 * (3300 x 2550) on a phone whose browser will not make a canvas that big. Each day's photo is the full-size original (see
 * fullPhoto.js), not the small preview the screen uses, cropped and shrunk to exactly its box.
 *
 * It is delivered through the phone's share sheet when there is one (which offers "Save Image", "Save to Files", AirDrop and the
 * like) and as a normal download otherwise. The file format and where it goes are still open; this is the first, plain version.
 */
import { drawCalendarPage, loadCalendarFonts } from './drawCalendarPage.js'
import { MONTHS } from '../lib/dates.js'
import { fullPhotoFor } from './fullPhoto.js'
import { pdfFromJpeg } from './makePdf.js'
import { PAGE_SIZES, pageLayout } from './pageLayout.js'

/** The paper, in inches: US Letter. A landscape page is 11 wide and 8.5 tall. */
const PAPER_IN = { landscape: { w: 11, h: 8.5 }, portrait: { w: 8.5, h: 11 } }
/** How hard the picture inside a PDF is compressed (JPEG, 0 to 1). A PNG is not compressed lossily at all. */
const PDF_JPEG_QUALITY = 0.95

/** Output sizes to try, best first: pixels per page unit. 4/3 makes a Letter landscape page 4400 x 3400 (about 400 dpi). */
const SCALES = [4 / 3, 1]

/** True if a canvas of this size really works here (some phones quietly give a blank one above their limit). */
function canvasWorks(w, h) {
  try {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (!g) return false
    g.fillStyle = '#f00'
    g.fillRect(w - 1, h - 1, 1, 1)
    const ok = g.getImageData(w - 1, h - 1, 1, 1).data[0] === 255
    c.width = c.height = 0
    return ok
  } catch { return false }
}

/**
 * @param {object} o  { format ('png' or 'pdf'), orientation, year, month, weekStartsOn, wallpaper, paper, photosByDay, previewFor, onProgress }
 *   photosByDay: Map<day, string> the url of each chosen day's full-size photo; previewFor(day): the small preview image to
 *   fall back on if an original cannot be read; onProgress(done, total) is called as the photos are prepared
 * @returns {Promise<{ blob: Blob, filename: string, width: number, height: number }>}
 */
export async function renderCalendarFile({ format = 'png', orientation, photosByDay, previewFor, onProgress, ...rest }) {
  await loadCalendarFonts()
  const { w: pw, h: ph } = PAGE_SIZES[orientation]
  const scale = SCALES.find(s => canvasWorks(Math.round(pw * s), Math.round(ph * s))) ?? 1
  const width = Math.round(pw * scale)
  const height = Math.round(ph * scale)

  // Prepare each chosen day's photo at the size of its box on this page, one at a time
  const layout = pageLayout(pw, ph, rest.year, rest.month, rest.weekStartsOn ?? 0)
  const boxes = new Map(layout.tiles.map(t => [t.day, t]))
  const days = [...photosByDay.keys()].filter(d => boxes.has(d))
  const prepared = new Map()
  let done = 0
  for (const day of days) {
    onProgress?.(done, days.length)
    const box = boxes.get(day)
    try {
      prepared.set(day, await fullPhotoFor(photosByDay.get(day), box.w * scale, box.h * scale))
    } catch {
      prepared.set(day, previewFor(day)) // the original could not be read: the small preview is better than a gap
    }
    done++
  }
  onProgress?.(days.length, days.length)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  drawCalendarPage(canvas.getContext('2d', { willReadFrequently: true }), { W: pw, H: ph, scale, ...rest, photoFor: day => prepared.get(day) ?? null })
  const encode = (type, quality) => new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not make the picture'))), type, quality))
  let blob
  if (format === 'pdf') {
    // The picture goes into the PDF as a high-quality JPEG, placed at the paper's exact size
    const jpeg = new Uint8Array(await (await encode('image/jpeg', PDF_JPEG_QUALITY)).arrayBuffer())
    const paper = PAPER_IN[orientation]
    blob = pdfFromJpeg(jpeg, width, height, paper.w, paper.h, `Calendar ${MONTHS[rest.month]} ${rest.year}`)
  } else {
    blob = await encode('image/png')
  }
  canvas.width = canvas.height = 0 // let go of the memory
  for (const c of prepared.values()) if (c instanceof HTMLCanvasElement) c.width = c.height = 0
  const filename = `calendar-${rest.year}-${String(rest.month + 1).padStart(2, '0')}.${format === 'pdf' ? 'pdf' : 'png'}`
  return { blob, filename, width, height }
}

/**
 * Sends the file to the person.
 * @returns {Promise<'shared'|'downloaded'|'cancelled'|'needs-tap'>}  'needs-tap': the browser wants a fresh tap before it
 *   will open the share sheet (it times out while a big picture is being made), so the caller offers a button
 */
export async function deliverFile({ blob, filename }) {
  const file = new File([blob], filename, { type: blob.type || (filename.endsWith('.pdf') ? 'application/pdf' : 'image/png') })
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
      if (e?.name === 'NotAllowedError') return 'needs-tap'
      // anything else: fall back to a download
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 15000)
  return 'downloaded'
}
