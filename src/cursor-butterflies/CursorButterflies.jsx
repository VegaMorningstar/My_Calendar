/**
 * Mounts the butterflies that follow the cursor for as long as this is rendered.
 *
 * Thin on purpose: the animation is plain DOM and requestAnimationFrame (see follow.ts), and React's only job is to start it and
 * tear it down. Nothing in the loop touches React state. Renders nothing itself.
 */
import { useEffect } from 'react'
import { mountCursorButterflies } from './follow'

/**
 * @param {number} [count]  how many butterflies (the app uses three)
 * @param {number} [size]   sprite scale, 0.15 is about a 21px wingspan
 * @param {boolean} [respectReducedMotion]  draw nothing when the visitor has asked for reduced motion (default true)
 */
export default function CursorButterflies({ count, size, respectReducedMotion }) {
  useEffect(() => {
    const swarm = mountCursorButterflies({ count, size, respectReducedMotion })
    return () => swarm.destroy()
  }, [count, size, respectReducedMotion])
  return null
}
