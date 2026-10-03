/**
 * Full-screen view of one day: the date, and every photo taken on it.
 *
 * Photos show as a grid of square thumbnails; tapping one opens it full screen
 * in PhotoViewer. Moving between days:
 *   Left / Right arrow keys, or a horizontal swipe, or the < > buttons
 *   go to the previous / next date that has photos.
 * The dialog closes from the burgundy X, the Escape key, or a click outside the
 * sheet (Escape closes an open photo first). It is rendered in a portal on
 * <body> so it covers the whole viewport whatever the calendar's own layout is,
 * and it puts focus back where it was on close.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GlassButtons, LiquidGlassPanel, PANEL_GLASS, usePanelGlass } from '../wwn-glass/index.js'
import { FULL_WEEKDAYS, MONTHS, dayOfYear, daysInYear, photoCountLabel } from '../lib/dates.js'
import PhotoViewer from './PhotoViewer.jsx'
import { BURGUNDY_TINT, CLOSE_MATERIAL, NAV_MATERIAL, PANEL_FALLBACK } from '../lib/glass-config.js'
import '../styles/base.css'
import '../styles/detail.css'

/** A horizontal drag longer than this many px (and mostly sideways) changes day. */
const SWIPE_PX = 70

/**
 * @param {{year:number, month:number, day:number}} date  the day to show
 * @param {string[]} srcs          the day's photos (previews, if there are any)
 * @param {Map<string,string>} [fullBySrc]  preview URL -> full-size URL for the viewer
 * @param {{ink:string, halo:string}} pageInk  adaptive text colours for the page
 * @param {boolean}  hasPrev       an earlier date with photos exists
 * @param {boolean}  hasNext       a later date with photos exists
 * @param {Function} onStep        (delta:-1|1) => void, go to the previous / next such date
 * @param {Function} onClose       () => void
 */
export default function DayDetail({ date, srcs, fullBySrc, pageInk, hasPrev, hasNext, onStep, onClose }) {
  const { year, month, day } = date
  const sheetRef = useRef(null)
  const scrollRef = useRef(null)
  /** Index of the photo open full screen, or null for the grid. */
  const [viewing, setViewing] = useState(null)
  /** When the photo viewer last closed. A swipe-down that closes it can be followed by a stray press on the veil. */
  const viewerClosedAt = useRef(0)
  const closeViewer = () => { viewerClosedAt.current = performance.now(); setViewing(null) }
  /** Which way the last move went, so the new day slides in from the right side. */
  const [slide, setSlide] = useState('next')

  /** Go to the previous / next day with photos, if there is one. */
  const stepDay = delta => {
    if (delta < 0 ? !hasPrev : !hasNext) return
    setSlide(delta > 0 ? 'next' : 'prev')
    onStep(delta)
  }

  // The key handler is bound once, so it reads the latest values through a ref
  const latest = useRef({})
  latest.current = { stepDay, onClose, viewing, closeViewer }

  // The sheet's glass surface (WebGPU, or WWN's CSS glass as a fallback)
  usePanelGlass(sheetRef, PANEL_FALLBACK)

  useEffect(() => {
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // the page behind must not scroll
    sheetRef.current?.focus()

    // Capture phase, so these run before any page-level handler sees the key
    const onKey = e => {
      const { stepDay, onClose, viewing, closeViewer } = latest.current
      if (e.key === 'Escape') {
        e.stopPropagation()
        // One step back per Escape: the open photo first, then the day
        if (viewing !== null) closeViewer()
        else onClose()
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && viewing === null) {
        // With a photo open, the arrows belong to the photo viewer instead
        e.stopPropagation()
        stepDay(e.key === 'ArrowRight' ? 1 : -1)
      }
    }
    window.addEventListener('keydown', onKey, true)

    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = previousOverflow
      opener?.focus?.()
    }
  }, [])

  // A new day starts at the top of its photos
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [year, month, day])

  // ── Swipe between days ──────────────────────────────────────────────────────
  const drag = useRef(null)
  const swiped = useRef(false)
  const onPointerDown = e => { drag.current = { x: e.clientX, y: e.clientY }; swiped.current = false }
  const onPointerUp = e => {
    const start = drag.current
    drag.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true // so the thumbnail under the finger does not also open
      setTimeout(() => { swiped.current = false }, 400) // a stale flag must not eat a later keyboard activation
      stepDay(dx < 0 ? 1 : -1)
    }
  }

  const weekday = FULL_WEEKDAYS[new Date(year, month, day).getDay()]
  const navItems = [
    { key: 'prev-day', label: '←', title: hasPrev ? 'Previous day with photos' : 'No earlier day', onClick: () => stepDay(-1), fallbackClass: 'pc-round' },
    { key: 'next-day', label: '→', title: hasNext ? 'Next day with photos' : 'No later day', onClick: () => stepDay(1), fallbackClass: 'pc-round' },
  ]
  const closeItem = [{
    key: 'close', label: '×', title: 'Close', onClick: onClose,
    fallbackClass: 'pc-round pc-burgundy', tint: BURGUNDY_TINT,
  }]

  return createPortal(
    <div
      className="pc-overlay"
      style={{ '--pc-ink': pageInk.ink, '--pc-hi': pageInk.halo }}
      // Only a press on the veil itself counts as "clicking away", not one inside the sheet
      onMouseDown={e => { if (e.target === e.currentTarget && performance.now() - viewerClosedAt.current > 500) onClose() }}
    >
      <div
        className="pc-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${weekday} ${day} ${MONTHS[month]} ${year}`}
        tabIndex={-1}
      >
        <LiquidGlassPanel params={PANEL_GLASS} />
        <div
          className="pc-sheet-scroll"
          ref={scrollRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onClickCapture={e => { if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false } }}
        >
          {/* Keyed by date, so every day change replays the slide-in */}
          <div key={`${year}-${month}-${day}`} className={`pc-day-content pc-slide-${slide}`}>
            <header className="pc-detail-head">
              <div>
                <h2 className="pc-detail-dow">{weekday}</h2>
                <p className="pc-detail-date">{day} {MONTHS[month]} {year}</p>
                <p className="pc-detail-meta">
                  Day {dayOfYear(year, month, day)} of {daysInYear(year)} · {photoCountLabel(srcs.length)}
                </p>
              </div>
              <div className="pc-detail-actions">
                <GlassButtons items={navItems} material={NAV_MATERIAL} />
                <GlassButtons items={closeItem} material={CLOSE_MATERIAL} />
              </div>
            </header>

            <div className="pc-gallery">
              {srcs.map((src, i) => (
                <button
                  type="button"
                  key={src}
                  className="pc-thumb"
                  style={{ animationDelay: `${Math.min(i, 16) * 30}ms` }}
                  aria-label={`Open photo ${i + 1} of ${srcs.length}`}
                  onClick={() => setViewing(i)}
                >
                  <img src={src} alt="" loading="lazy" decoding="async" draggable="false" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {viewing !== null && (
        <PhotoViewer srcs={srcs.map(s => fullBySrc?.get(s) ?? s)} index={viewing} onIndex={setViewing} onClose={closeViewer} />
      )}
    </div>,
    document.body,
  )
}
