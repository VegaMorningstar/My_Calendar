/**
 * Full-screen photo viewer, with the gestures of the iPhone Photos app.
 *
 *   double-tap           zoom in on the spot tapped; double-tap again to zoom back out
 *   pinch                zoom in and out, around the fingers
 *   drag (zoomed in)     pan around the photo
 *   swipe left / right   next / previous photo (when not zoomed in)
 *   swipe down           drag the photo away to close, the backdrop fading as you go
 *   single tap           show or hide the buttons; a tap on the black edge closes
 *
 * On a computer: double-click zooms, trackpad pinch or Ctrl+scroll zooms, drag
 * pans, the arrow keys change photo, + / - / 0 zoom in / out / reset. Escape is
 * handled by the parent dialog, which closes the viewer first.
 *
 * The photo's transform is written straight to the element while a finger is
 * down, not through React state, so dragging and pinching stay smooth.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import '../styles/base.css'
import '../styles/detail.css'
import '../styles/viewer.css'

const MAX_SCALE = 6
const MIN_SCALE = 1
/** How far a double-tap or a "+" key press zooms. */
const DOUBLE_TAP_SCALE = 2.5
/** Two taps closer together than this (ms) and 30px count as a double-tap. */
const DOUBLE_TAP_MS = 300
/** A finger that moves less than this many px is still a tap. */
const TAP_SLOP = 10
/** A horizontal swipe longer than this (px) changes photo. */
const SWIPE_PX = 60
/** A downward drag longer than this (px) closes the viewer. */
const DISMISS_PX = 110
/** Below this a photo counts as "fit to screen" and not zoomed. */
const FIT_EPSILON = 1.01

const SNAP = 'transform .28s cubic-bezier(.2,.8,.2,1)'
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/** Drawn shapes for the buttons: unlike a text character, an SVG centres exactly whatever the font. */
const icon = path => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
)
const CLOSE_ICON = icon('M6 6l12 12M18 6L6 18')
const PREV_ICON = icon('M15 5l-7 7 7 7')
const NEXT_ICON = icon('M9 5l7 7-7 7')

/**
 * @param {string[]} srcs     the day's photos (full size)
 * @param {number}   index    which one is showing
 * @param {Function} onIndex  (nextIndex:number) => void
 * @param {Function} onClose  () => void
 */
export default function PhotoViewer({ srcs, index, onIndex, onClose }) {
  const count = srcs.length
  const rootRef = useRef(null)
  const imgRef = useRef(null)

  /** Current zoom and pan: scale, and offset in px from the centred position. */
  const view = useRef({ s: 1, x: 0, y: 0 })
  /** Fingers (or the mouse) currently down, by pointer id. */
  const pointers = useRef(new Map())
  /** The gesture in progress, if any. */
  const gesture = useRef(null)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })
  const tapTimer = useRef(null)
  const [chromeHidden, setChromeHidden] = useState(false)

  const step = delta => onIndex((index + delta + count) % count)

  // ── Transform helpers ───────────────────────────────────────────────────────

  /** Paints the current view onto the photo; `animate` eases it, otherwise it follows instantly. */
  const paint = (animate = false) => {
    const img = imgRef.current
    if (!img) return
    const { s, x, y } = view.current
    img.style.transition = animate ? SNAP : 'none'
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`
  }

  /** How far the photo may be dragged from centre at scale `s` before its edge shows. */
  const panLimit = s => {
    const img = imgRef.current
    const root = rootRef.current
    return {
      x: Math.max(0, (img.offsetWidth * s - root.clientWidth) / 2),
      y: Math.max(0, (img.offsetHeight * s - root.clientHeight) / 2),
    }
  }

  /** Keeps a view inside its limits. */
  const settle = v => {
    const s = clamp(v.s, MIN_SCALE, MAX_SCALE)
    const lim = panLimit(s)
    return { s, x: clamp(v.x, -lim.x, lim.x), y: clamp(v.y, -lim.y, lim.y) }
  }

  const setView = (v, animate) => { view.current = v; paint(animate) }
  const reset = animate => setView({ s: 1, x: 0, y: 0 }, animate)
  const isZoomed = () => view.current.s > FIT_EPSILON

  /** Zoom to `scale`, keeping the photo point under (px, py) in place. */
  const zoomAt = (scale, px, py, animate) => {
    const r = rootRef.current.getBoundingClientRect()
    const cx = px - r.left - r.width / 2
    const cy = py - r.top - r.height / 2
    const { s, x, y } = view.current
    const s2 = clamp(scale, MIN_SCALE, MAX_SCALE)
    const k = s2 / s
    setView(settle({ s: s2, x: cx - (cx - x) * k, y: cy - (cy - y) * k }), animate)
  }

  /** Double-tap / double-click: in to DOUBLE_TAP_SCALE on that spot, or back out if already zoomed. */
  const toggleZoom = (px, py) => (isZoomed() ? reset(true) : zoomAt(DOUBLE_TAP_SCALE, px, py, true))

  /** Backdrop opacity while dragging down to close. */
  const setBackdrop = a => rootRef.current.style.setProperty('--pc-bg-a', String(a))

  // A new photo starts fitted to the screen
  // Tells the page a photo is full screen, so what flies over the page (the cursor butterflies, see src/cursor-butterflies) stays out of the picture
  useEffect(() => {
    document.documentElement.classList.add('pc-photo-open')
    return () => document.documentElement.classList.remove('pc-photo-open')
  }, [])

  useEffect(() => { reset(false); setBackdrop(0.94) }, [index]) // eslint-disable-line

  // ── Keyboard ────────────────────────────────────────────────────────────────
  const latest = useRef({})
  latest.current = { step }
  useEffect(() => {
    const onKey = e => {
      const centre = [window.innerWidth / 2, window.innerHeight / 2]
      if (e.key === 'ArrowRight') latest.current.step(1)
      else if (e.key === 'ArrowLeft') latest.current.step(-1)
      else if (e.key === '+' || e.key === '=') zoomAt(view.current.s * 1.5, ...centre, true)
      else if (e.key === '-') zoomAt(view.current.s / 1.5, ...centre, true)
      else if (e.key === '0') reset(true)
      else return
      e.stopPropagation() // the calendar behind must not react as well
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, []) // eslint-disable-line

  // ── Trackpad pinch and Ctrl+scroll (a non-passive listener, so it can stop the page zooming) ─
  useEffect(() => {
    const root = rootRef.current
    const onWheel = e => {
      if (e.ctrlKey) {
        e.preventDefault()
        zoomAt(view.current.s * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY, false)
      } else if (isZoomed()) {
        e.preventDefault()
        setView(settle({ ...view.current, x: view.current.x - e.deltaX, y: view.current.y - e.deltaY }), false)
      }
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, []) // eslint-disable-line

  // Warm the neighbours so swiping never waits on a download
  useEffect(() => {
    for (const d of [-1, 1]) new Image().src = srcs[(index + d + count) % count]
  }, [index, srcs, count])

  useEffect(() => () => clearTimeout(tapTimer.current), [])

  // ── Pointer gestures ────────────────────────────────────────────────────────

  /** Starts (or restarts) a one-finger gesture from the current position. */
  const beginOne = (e, tappable) => {
    gesture.current = {
      mode: 'one', sx: e.clientX, sy: e.clientY, t: performance.now(),
      from: { ...view.current }, moved: !tappable, axis: null,
      onImage: e.target === imgRef.current,
    }
  }

  const onPointerDown = e => {
    if (e.target.closest('button')) return // let the buttons work normally
    rootRef.current.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      clearTimeout(tapTimer.current)
      gesture.current = {
        mode: 'pinch', d0: Math.max(dist(a, b), 1), from: { ...view.current },
        mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
    } else if (pointers.current.size === 1) {
      beginOne(e, true)
    }
  }

  const onPointerMove = e => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return

    if (g.mode === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const r = rootRef.current.getBoundingClientRect()
      // Allow a little give below fit-to-screen; it snaps back on release
      const s2 = clamp(g.from.s * (dist(a, b) / g.d0), MIN_SCALE * 0.7, MAX_SCALE * 1.15)
      const c0 = { x: g.mid0.x - r.left - r.width / 2, y: g.mid0.y - r.top - r.height / 2 }
      const c = { x: (a.x + b.x) / 2 - r.left - r.width / 2, y: (a.y + b.y) / 2 - r.top - r.height / 2 }
      // The photo point that was under the fingers' start must follow their midpoint
      const k = s2 / g.from.s
      view.current = { s: s2, x: c.x - (c0.x - g.from.x) * k, y: c.y - (c0.y - g.from.y) * k }
      paint(false)
      return
    }

    if (g.mode !== 'one') return
    const dx = e.clientX - g.sx
    const dy = e.clientY - g.sy
    if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return
    g.moved = true

    if (g.from.s > FIT_EPSILON) {
      // Zoomed in: the drag pans the photo
      setView(settle({ s: g.from.s, x: g.from.x + dx, y: g.from.y + dy }), false)
      return
    }

    // Fitted to screen: the first clear direction decides what this drag is
    if (!g.axis) g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (g.axis === 'x') {
      // Slide with the finger; the stored view is untouched, so letting go springs back
      imgRef.current.style.transition = 'none'
      imgRef.current.style.transform = `translate3d(${dx}px, 0, 0)`
    } else if (dy > 0) {
      const shrink = 1 - Math.min(dy / rootRef.current.clientHeight, 0.5) * 0.45
      imgRef.current.style.transition = 'none'
      imgRef.current.style.transform = `translate3d(${dx * 0.4}px, ${dy}px, 0) scale(${shrink})`
      setBackdrop(0.94 * (1 - Math.min(dy / (rootRef.current.clientHeight * 0.55), 1)))
    }
  }

  const finish = (e, cancelled) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (!g) return

    if (g.mode === 'pinch') {
      if (pointers.current.size === 1) {
        // One finger stays down: carry on as a pan from where the pinch ended
        const [p] = [...pointers.current.values()]
        setView(settle(view.current), true)
        beginOne({ clientX: p.x, clientY: p.y, target: null }, false)
      } else {
        setView(settle(view.current), true)
        gesture.current = null
      }
      return
    }

    gesture.current = null
    if (g.mode !== 'one') return
    const dx = e.clientX - g.sx
    const dy = e.clientY - g.sy

    if (!g.moved && !cancelled) { handleTap(e, g); return }

    if (g.from.s <= FIT_EPSILON && !cancelled) {
      if (g.axis === 'x' && Math.abs(dx) > SWIPE_PX && count > 1) {
        reset(false)
        step(dx < 0 ? 1 : -1)
        return
      }
      if (g.axis === 'y' && dy > DISMISS_PX) { onClose(); return }
    }
    // Not far enough to count: spring back
    paint(true)
    setBackdrop(0.94)
  }

  /** A tap that did not move: either half of a double-tap, or a single tap. */
  const handleTap = (e, g) => {
    const now = performance.now()
    const prev = lastTap.current
    if (now - prev.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 30) {
      clearTimeout(tapTimer.current)
      lastTap.current = { t: 0, x: 0, y: 0 }
      toggleZoom(e.clientX, e.clientY)
      return
    }
    lastTap.current = { t: now, x: e.clientX, y: e.clientY }
    // Wait to see whether a second tap follows before treating this as a single tap
    tapTimer.current = setTimeout(() => {
      if (g.onImage) setChromeHidden(h => !h)
      else if (!isZoomed()) onClose() // the black area outside the photo
    }, DOUBLE_TAP_MS)
  }

  return createPortal(
    <div
      ref={rootRef}
      className={`pc-viewer${chromeHidden ? ' pc-viewer-clean' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${count}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={e => finish(e, false)}
      onPointerCancel={e => finish(e, true)}
    >
      {/* Keyed by source so each photo fades in rather than snapping */}
      <img ref={imgRef} className="pc-viewer-img" key={srcs[index]} src={srcs[index]} alt={`Photo ${index + 1} of ${count}`} draggable="false" />

      <button type="button" className="pc-viewer-btn pc-viewer-close" aria-label="Close photo" onClick={onClose}>{CLOSE_ICON}</button>
      {count > 1 && (
        <>
          <button type="button" className="pc-viewer-btn pc-viewer-prev" aria-label="Previous photo" onClick={() => step(-1)}>{PREV_ICON}</button>
          <button type="button" className="pc-viewer-btn pc-viewer-next" aria-label="Next photo" onClick={() => step(1)}>{NEXT_ICON}</button>
          <span className="pc-viewer-count">{index + 1} / {count}</span>
        </>
      )}
    </div>,
    document.body,
  )
}
