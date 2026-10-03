/**
 * Full-screen photo viewer.
 *
 * Shows one photo of a day fitted to the screen. Move between the day's photos
 * with the arrow keys, the side arrows (pointer devices) or a horizontal swipe
 * (touch). Clicking the black area outside the photo, or the X, closes it. The
 * Escape key is handled by the parent dialog, which closes the viewer first.
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import '../styles/base.css'
import '../styles/detail.css'
import '../styles/viewer.css'

/** A horizontal drag longer than this many px counts as a swipe. */
const SWIPE_PX = 50

/**
 * @param {string[]} srcs     the day's photos
 * @param {number}   index    which one is showing
 * @param {Function} onIndex  (nextIndex:number) => void
 * @param {Function} onClose  () => void
 */
export default function PhotoViewer({ srcs, index, onIndex, onClose }) {
  const count = srcs.length
  const drag = useRef(null)

  const step = delta => onIndex((index + delta + count) % count)
  // The key handler is bound once, so it reads the latest values through a ref
  const latest = useRef({})
  latest.current = { step }

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowRight') latest.current.step(1)
      else if (e.key === 'ArrowLeft') latest.current.step(-1)
      else return
      e.stopPropagation() // the calendar behind must not also change month
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  // Warm the neighbours so swiping never waits on a download
  useEffect(() => {
    for (const d of [-1, 1]) new Image().src = srcs[(index + d + count) % count]
  }, [index, srcs, count])

  const onPointerDown = e => { drag.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = e => {
    const start = drag.current
    drag.current = null
    if (!start || count < 2) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1)
  }

  return createPortal(
    <div
      className="pc-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${count}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      // A plain click on the black area (not the photo or a button) closes the viewer
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Keyed by source so each photo fades in rather than snapping */}
      <img className="pc-viewer-img" key={srcs[index]} src={srcs[index]} alt={`Photo ${index + 1} of ${count}`} draggable="false" />

      <button type="button" className="pc-viewer-btn pc-viewer-close" aria-label="Close photo" onClick={onClose}>×</button>
      {count > 1 && (
        <>
          <button type="button" className="pc-viewer-btn pc-viewer-prev" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>
          <button type="button" className="pc-viewer-btn pc-viewer-next" aria-label="Next photo" onClick={() => step(1)}>›</button>
          <span className="pc-viewer-count">{index + 1} / {count}</span>
        </>
      )}
    </div>,
    document.body,
  )
}
