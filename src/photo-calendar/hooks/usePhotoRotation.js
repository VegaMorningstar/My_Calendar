/**
 * Cycles through a day's photos on a randomised timer.
 *
 * Each cell draws its own random start offset and jitters every later wait, so
 * the grid never swaps in unison: photos change here and there, one at a time.
 */
import { useEffect, useRef, useState } from 'react'

/** Each wait is `intervalMs` scaled by a random factor in 1 +/- JITTER. */
const JITTER = 0.4
/** Never swap sooner than this, so a cell cannot flicker. */
const MIN_WAIT_MS = 600

/**
 * @param {number} count       photos on the day
 * @param {number} intervalMs  average time each photo stays up
 * @returns {number} index of the photo to show
 */
export default function usePhotoRotation(count, intervalMs) {
  const [index, setIndex] = useState(0)
  const firstWait = useRef(true)

  useEffect(() => {
    if (count < 2) return
    // The first wait is anywhere in [0, intervalMs] so cells start out of step.
    const wait = firstWait.current
      ? Math.random() * intervalMs
      : intervalMs * (1 - JITTER + 2 * JITTER * Math.random())
    firstWait.current = false
    const timer = setTimeout(() => setIndex(i => (i + 1) % count), Math.max(wait, MIN_WAIT_MS))
    return () => clearTimeout(timer)
  }, [index, count, intervalMs])

  return index
}
