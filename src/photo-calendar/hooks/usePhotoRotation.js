/**
 * Cycles through a day's photos on a randomised timer.
 *
 * Each cell draws its own random wait, so the grid never swaps in unison: photos change
 * here and there, one at a time. A photo always stays up at least `intervalMs`; the random
 * part only adds to that, so nothing swaps sooner than the interval.
 */
import { useEffect, useRef, useState } from 'react'

/** Each wait is `intervalMs` plus up to this fraction of it more. */
const JITTER = 0.4
/** The first wait can run longer, so cells start out of step with each other. */
const FIRST_JITTER = 0.6

/**
 * @param {number} count       photos on the day
 * @param {number} intervalMs  the least time each photo stays up
 * @returns {number} index of the photo to show, always inside the day's photos: when photos are deleted the day gets shorter, and a
 *   remembered position past the end must not leave the tile blank (with one photo left the timer never runs, so it would stay blank)
 */
export default function usePhotoRotation(count, intervalMs) {
  const [index, setIndex] = useState(0)
  const firstWait = useRef(true)

  useEffect(() => {
    if (count < 2) return
    const wait = intervalMs * (1 + (firstWait.current ? FIRST_JITTER : JITTER) * Math.random())
    firstWait.current = false
    const timer = setTimeout(() => setIndex(i => ((i % count) + 1) % count), wait)
    return () => clearTimeout(timer)
  }, [index, count, intervalMs])

  return count > 0 ? index % count : 0
}
