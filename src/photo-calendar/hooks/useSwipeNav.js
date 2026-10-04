/**
 * Swipe left or right to step through the calendar, like turning a page.
 *
 * Returns event handlers to spread onto the element that should respond. Touch and
 * pen only: dragging with a mouse should not change the month. A swipe is a mostly
 * sideways drag longer than SWIPE_PX; vertical drags are left to the page to scroll
 * (the element needs `touch-action: pan-y` so horizontal drags reach these handlers).
 *
 * A swipe that starts on a day box would otherwise also "click" it when the finger
 * lifts; the click is swallowed.
 */
import { useRef } from 'react'

/** A drag longer than this many px counts as a swipe. */
const SWIPE_PX = 60
/** ...and it must be this many times longer sideways than up or down. */
const SIDEWAYS_RATIO = 1.5

/**
 * @param {(direction: -1 | 1) => void} onSwipe  1 for a swipe left (next), -1 for right (previous)
 */
export default function useSwipeNav(onSwipe) {
  const start = useRef(null)
  const swiped = useRef(false)
  // The handlers are recreated every render; the latest callback is read through a ref
  const callback = useRef(onSwipe)
  callback.current = onSwipe

  const down = useRef(new Set()) // fingers currently on the element: two of them are a pinch, not a swipe

  return {
    onPointerDown: e => {
      if (e.pointerType === 'mouse') return
      down.current.add(e.pointerId)
      if (down.current.size > 1) { start.current = null; return }
      start.current = { x: e.clientX, y: e.clientY }
      swiped.current = false
    },
    onPointerUp: e => {
      down.current.delete(e.pointerId)
      const from = start.current
      start.current = null
      if (!from) return
      const dx = e.clientX - from.x
      const dy = e.clientY - from.y
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * SIDEWAYS_RATIO) return
      swiped.current = true
      // A stale flag must not swallow a later click (a keyboard activation has no pointer-down to clear it)
      setTimeout(() => { swiped.current = false }, 400)
      callback.current(dx < 0 ? 1 : -1)
    },
    onPointerCancel: e => { down.current.delete(e.pointerId); start.current = null },
    onClickCapture: e => {
      if (!swiped.current) return
      e.stopPropagation()
      e.preventDefault()
      swiped.current = false
    },
  }
}
