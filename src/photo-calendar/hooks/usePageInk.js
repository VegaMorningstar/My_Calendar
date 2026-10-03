/**
 * Ink colours for text that sits on the page, or on glass over the page, chosen
 * from how dark it is right behind that text.
 *
 * Pass a ref to the element the text lives in and the brightness is measured
 * under that element, so a calendar over a dark patch of the wallpaper gets light
 * text while a footnote over a bright patch gets dark text. With no ref it uses
 * the whole screen. It re-measures when the wallpaper or page colour changes, the
 * element resizes, the window resizes, and on scroll (the wallpaper stays put
 * while the page moves over it).
 */
import { useEffect, useState } from 'react'
import { backdropLuma, inkFor } from '../lib/adaptive-ink.js'
import { getBackgroundImage, onPaperChange, syncPaperFromBody } from '../wwn-glass/index.js'

/** Opacity of the readability veil laid over the glass when the page has a photo background. */
const PHOTO_VEIL = 0.22

/** Ink, halo and veil for the area behind `el` (or the whole screen). */
function read(el) {
  const rect = el?.getBoundingClientRect()
  const usable = rect && rect.width > 0 && rect.height > 0
  return { ...inkFor(backdropLuma(usable ? rect : null)), veil: getBackgroundImage() ? PHOTO_VEIL : 0 }
}

/**
 * @param {{current: Element|null}} [ref]  the element the text sits in
 * @returns {{ ink: string, halo: string, veil: number }} 'r, g, b' strings (text colour and its
 *   etching opposite) and the veil opacity: 0 on a plain page, a soft wash over a photo
 */
export default function usePageInk(ref) {
  const [value, setValue] = useState(() => read(null))

  useEffect(() => {
    syncPaperFromBody()
    let frame = 0
    // Only replace the state when the answer actually changed, so scrolling does not re-render
    const update = () => {
      frame = 0
      const next = read(ref?.current)
      setValue(prev => (prev.ink === next.ink && prev.halo === next.halo && prev.veil === next.veil ? prev : next))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }

    update()
    const offPaper = onPaperChange(schedule)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { passive: true })
    const observer = typeof ResizeObserver !== 'undefined' && ref?.current ? new ResizeObserver(schedule) : null
    observer?.observe(ref.current)
    return () => {
      cancelAnimationFrame(frame)
      offPaper()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule)
      observer?.disconnect()
    }
  }, [ref])

  return value
}
