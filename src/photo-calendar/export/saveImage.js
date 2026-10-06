/**
 * Renders the calendar page at full size and hands it to the person.
 *
 * What is saved is a PNG of the whole page (see PAGE_SIZES: 300 dpi US Letter). It is delivered through the phone's share
 * sheet when there is one (which offers "Save Image", "Save to Files", AirDrop and the like) and as a normal download
 * otherwise. The file format and where it goes are still open; this is the first, plain version.
 */
import { drawCalendarPage, loadCalendarFonts } from './drawCalendarPage.js'
import { PAGE_SIZES } from './pageLayout.js'

/**
 * @param {object} o  everything drawCalendarPage needs, except the size: { orientation, year, month, weekStartsOn, wallpaper, paper, photoFor }
 * @returns {Promise<{ blob: Blob, filename: string, width: number, height: number }>}
 */
export async function renderCalendarFile({ orientation, ...rest }) {
  await loadCalendarFonts()
  const { w, h } = PAGE_SIZES[orientation]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  drawCalendarPage(canvas.getContext('2d'), { W: w, H: h, scale: 1, ...rest })
  const blob = await new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not make the picture'))), 'image/png'))
  canvas.width = canvas.height = 0 // let go of the memory
  const filename = `calendar-${rest.year}-${String(rest.month + 1).padStart(2, '0')}.png`
  return { blob, filename, width: w, height: h }
}

/**
 * Sends the file to the person.
 * @returns {Promise<'shared'|'downloaded'|'cancelled'|'needs-tap'>}  'needs-tap': the browser wants a fresh tap before it
 *   will open the share sheet (it times out while a big picture is being made), so the caller offers a button
 */
export async function deliverFile({ blob, filename }) {
  const file = new File([blob], filename, { type: blob.type })
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
