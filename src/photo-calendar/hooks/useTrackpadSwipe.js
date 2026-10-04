/**
 * Two-finger swipes on a laptop trackpad (and Shift + mouse wheel) step through the
 * calendar, as touch swipes do on a phone.
 *
 * A trackpad swipe reaches the page as a stream of sideways scroll (wheel) events, and
 * keeps coming for a second or so after the fingers lift (momentum). So one gesture
 * must count once: the first time the sideways distance passes THRESHOLD_PX a step is
 * made, and further events are ignored until the stream goes quiet for QUIET_MS.
 *
 * Mostly-sideways events over the element are also cancelled, so the browser does not
 * read the same swipe as "go back a page". Up-and-down scrolling is left alone.
 */
import { useEffect, useRef } from 'react'

/** Sideways travel (px) that counts as a swipe. */
const THRESHOLD_PX = 70
/** A gap this long (ms) with no events ends a gesture, so the next swipe can count. */
const QUIET_MS = 180

/**
 * @param {{current: HTMLElement|null}} ref  the element to listen on
 * @param {(direction: -1 | 1) => void} onSwipe  1 for next, -1 for previous
 */
export default function useTrackpadSwipe(ref, onSwipe) {
  const callback = useRef(onSwipe)
  callback.current = onSwipe

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let travelled = 0
    let spent = false // this gesture has already made its step
    let timer = 0

    const onWheel = e => {
      // Only mostly-sideways motion: a plain vertical scroll is not ours
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault() // stop the browser treating it as back/forward navigation

      clearTimeout(timer)
      timer = setTimeout(() => { travelled = 0; spent = false }, QUIET_MS)
      if (spent) return

      travelled += e.deltaX
      if (Math.abs(travelled) < THRESHOLD_PX) return
      spent = true
      // Positive deltaX is content moving left, i.e. a swipe left: next
      callback.current(travelled > 0 ? 1 : -1)
    }

    // Non-passive, or preventDefault would be ignored
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(timer) }
  }, [ref])
}
