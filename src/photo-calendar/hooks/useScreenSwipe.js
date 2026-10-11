/**
 * Swipe left or right anywhere on the screen to step through the calendar, like turning a page: the month (or year) on the
 * calendar, the day on the day sheet.
 *
 * Listens on the whole window, so a swipe counts wherever it starts: on the panel, on a date box, or on the wallpaper beside
 * them. A swipe is a mostly sideways drag longer than SWIPE_PX; it is decided the moment the drag gets that far, so the page turns
 * while the finger is still moving.
 *
 * Fingers are read through touch events, not pointer events. The calendar sits inside a scroll container (`.stage`), and once a
 * phone decides a drag is a scroll it cancels the touch's pointer events (`pointercancel`); a swipe that began a little upwards or
 * downwards was then lost, which is why swiping between months used to work only some of the time. Touch events keep coming while
 * the page scrolls. A mouse drag counts too (pointer events, mouse only), as it always did on the day sheet.
 *
 * Nothing is remembered between touches: each touch starts afresh, and a second finger makes it a pinch, never a swipe.
 * Swipes on anything inside `[data-no-swipe]` (the cameras, the guided tour) are left alone.
 */
import { useEffect, useRef } from 'react'

/** A drag longer than this many px counts as a swipe. */
const SWIPE_PX = 60
/** ...and it must be this many times longer sideways than up or down. */
const SIDEWAYS_RATIO = 1.5
/** The click that can follow a swipe (a mouse drag, a lift over a date box) is swallowed until this long after the drag ends. */
const SWALLOW_MS = 400

/**
 * @param {(direction: -1 | 1) => void} onSwipe  1 for a swipe left (next), -1 for right (previous)
 * @param {boolean} [enabled]  false while something on top has gestures of its own (an open day, the photo viewer, selecting)
 */
export default function useScreenSwipe(onSwipe, enabled = true) {
  // The latest callback is read through a ref, so the listeners need not be added again on every render
  const callback = useRef(onSwipe)
  callback.current = onSwipe

  useEffect(() => {
    if (!enabled) return
    let start = null // { x, y } of the current one-finger (or mouse) drag, null when there is none or it is spent
    let swallowUntil = 0

    const begin = (x, y, target) => {
      start = target instanceof Element && target.closest('[data-no-swipe]') ? null : { x, y }
    }
    const track = (x, y) => {
      if (!start) return
      const dx = x - start.x
      const dy = y - start.y
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * SIDEWAYS_RATIO) return
      start = null // one swipe per drag
      swallowUntil = Infinity // until the drag ends (see `ended`), however long the finger or mouse stays down
      callback.current(dx < 0 ? 1 : -1)
    }

    // The swipe's own click comes right after the lift; a stale window must not swallow a later, real click
    const ended = () => { if (swallowUntil === Infinity) swallowUntil = performance.now() + SWALLOW_MS }

    // ── Fingers ──
    const onTouchStart = e => {
      if (e.touches.length === 1) begin(e.touches[0].clientX, e.touches[0].clientY, e.target)
      else start = null // a second finger: a pinch
    }
    const onTouchMove = e => {
      if (e.touches.length !== 1) { start = null; return }
      track(e.touches[0].clientX, e.touches[0].clientY)
    }
    // A phone can hold back touch moves while it scrolls; the lift still says where the finger ended
    const onTouchEnd = e => {
      const t = e.changedTouches[0]
      if (t && e.touches.length === 0) track(t.clientX, t.clientY)
      start = null
      if (e.touches.length === 0) ended()
    }
    const onTouchCancel = e => { start = null; if (e.touches.length === 0) ended() }

    // ── A mouse ──
    let mouseDown = false
    const onPointerDown = e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      mouseDown = true
      begin(e.clientX, e.clientY, e.target)
    }
    const onPointerMove = e => { if (mouseDown && e.pointerType === 'mouse') track(e.clientX, e.clientY) }
    const onPointerUp = e => { if (e.pointerType === 'mouse') { mouseDown = false; start = null; ended() } }

    const onClick = e => {
      if (performance.now() > swallowUntil) return
      swallowUntil = 0
      e.stopPropagation()
      e.preventDefault()
    }

    const passive = { passive: true, capture: true }
    window.addEventListener('touchstart', onTouchStart, passive)
    window.addEventListener('touchmove', onTouchMove, passive)
    window.addEventListener('touchend', onTouchEnd, passive)
    window.addEventListener('touchcancel', onTouchCancel, passive)
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove, true)
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('touchstart', onTouchStart, passive)
      window.removeEventListener('touchmove', onTouchMove, passive)
      window.removeEventListener('touchend', onTouchEnd, passive)
      window.removeEventListener('touchcancel', onTouchCancel, passive)
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('click', onClick, true)
    }
  }, [enabled])
}
