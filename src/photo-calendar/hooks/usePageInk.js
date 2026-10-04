/**
 * Ink colours for text that sits on the page, or on glass over the page, chosen
 * from how dark it is right behind that text.
 *
 * Pass a ref to the element the text lives in and the brightness is measured
 * under that element, so one date box over a dark patch of the wallpaper gets
 * light text while its neighbour over a bright patch gets dark text. With no ref
 * it uses the whole screen. It re-measures when the wallpaper or page colour
 * changes, the element resizes, the window resizes, and on scroll (the wallpaper
 * stays put while the page moves over it).
 *
 * Dozens of elements can use this at once, so the window listeners are shared:
 * one resize, scroll and paper-change listener serves every element, and the
 * work is batched into one animation frame.
 */
import { useEffect, useState } from 'react'
import { PHOTO_BAND, backdropLuma, inkFor } from '../lib/adaptive-ink.js'
import { getBackgroundImage, onPaperChange, syncPaperFromBody } from '../wwn-glass/index.js'

/** Opacity of the readability veil laid over the glass when the page has a photo background. */
const PHOTO_VEIL = 0.16

// ── One shared set of listeners ─────────────────────────────────────────────────
const subscribers = new Set()
let frame = 0
let bound = false

function notifyAll() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    subscribers.forEach(fn => fn())
  })
}

function subscribe(fn) {
  if (!bound) {
    bound = true
    window.addEventListener('resize', notifyAll)
    window.addEventListener('scroll', notifyAll, { passive: true })
    onPaperChange(notifyAll)
  }
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

/**
 * Ink, halo and veil for the area behind `el` (or the whole screen). `region` is
 * [left, top, right, bottom] as fractions of the element, to measure only the
 * part where the text actually sits.
 */
function read(el, region) {
  let rect = el?.getBoundingClientRect()
  if (rect && region) {
    const [l, t, r, b] = region
    rect = { left: rect.left + rect.width * l, right: rect.left + rect.width * r, top: rect.top + rect.height * t, bottom: rect.top + rect.height * b, width: rect.width * (r - l), height: rect.height * (b - t) }
  }
  const usable = rect && rect.width > 0 && rect.height > 0
  // A firm light-or-dark choice (narrow band): a blended grey in between is the least readable ink
  return { ...inkFor(backdropLuma(usable ? rect : null), PHOTO_BAND), veil: getBackgroundImage() ? PHOTO_VEIL : 0 }
}

/**
 * @param {{current: Element|null}} [ref]  the element the text sits in
 * @param {boolean} [enabled]  false skips all measuring (for text that picks its colour another way)
 * @param {number[]} [region]   [left, top, right, bottom] fractions of the element to measure, for text in one corner
 * @returns {{ ink: string, halo: string, veil: number }} 'r, g, b' strings (text colour and its
 *   glow colour) and the veil opacity: 0 on a plain page, a soft wash over a photo
 */
export default function usePageInk(ref, enabled = true, region) {
  const [value, setValue] = useState(() => read(null))

  useEffect(() => {
    if (!enabled) return
    syncPaperFromBody()
    // Only replace the state when the answer actually changed, so scrolling does not re-render
    const update = () => {
      const next = read(ref?.current, region)
      setValue(prev => (prev.ink === next.ink && prev.halo === next.halo && prev.veil === next.veil ? prev : next))
    }
    update()
    const unsubscribe = subscribe(update)
    const observer = typeof ResizeObserver !== 'undefined' && ref?.current ? new ResizeObserver(notifyAll) : null
    observer?.observe(ref.current)
    return () => { unsubscribe(); observer?.disconnect() }
  }, [ref, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return value
}

/** The same measurement as inline CSS variables, ready to put on the element: { '--pc-ink', '--pc-hi' }. */
export function inkVars(ink) {
  return { '--pc-ink': ink.ink, '--pc-hi': ink.halo }
}

/** Inline CSS variables for text in a named corner: { '--num-ink', '--num-hi' } for name 'num'. */
export const namedInkVars = (name, ink) => ({ [`--${name}-ink`]: ink.ink, [`--${name}-hi`]: ink.halo })
