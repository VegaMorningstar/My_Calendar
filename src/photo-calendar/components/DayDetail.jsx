/**
 * Full-screen view of one day: the date, and every photo taken on it.
 *
 * Photos show as a grid of square thumbnails; tapping one opens it full screen
 * in PhotoViewer. The dialog closes from the burgundy X, the Escape key, or a
 * click anywhere outside the sheet (Escape closes an open photo first). Rendered in a portal on <body> so it covers the whole viewport whatever
 * the calendar's own layout is, and puts focus back where it was on close.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GlassButtons, LiquidGlassPanel, PANEL_GLASS, usePanelGlass } from '../wwn-glass/index.js'
import { FULL_WEEKDAYS, MONTHS, dayOfYear, daysInYear, photoCountLabel } from '../lib/dates.js'
import PhotoViewer from './PhotoViewer.jsx'
import { BURGUNDY_TINT, CLOSE_MATERIAL, PANEL_FALLBACK } from '../lib/glass-config.js'
import '../styles/base.css'
import '../styles/detail.css'

/**
 * @param {{year:number, month:number, day:number}} date  the day to show
 * @param {string[]} srcs          the day's photos
 * @param {{ink:string, halo:string}} pageInk  adaptive text colours for the page
 * @param {Function} onClose       () => void
 */
export default function DayDetail({ date, srcs, pageInk, onClose }) {
  const { year, month, day } = date
  const sheetRef = useRef(null)
  /** Index of the photo open full screen, or null for the grid. */
  const [viewing, setViewing] = useState(null)
  const escape = useRef(null)
  // One step back per Escape: the open photo first, then the day
  escape.current = () => (viewing !== null ? setViewing(null) : onClose())

  // The sheet's glass surface (WebGPU, or WWN's CSS glass as a fallback)
  usePanelGlass(sheetRef, PANEL_FALLBACK)

  useEffect(() => {
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // the page behind must not scroll
    sheetRef.current?.focus()

    // Capture phase, so Escape closes the dialog before any page-level handler sees it
    const onKey = e => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      escape.current()
    }
    window.addEventListener('keydown', onKey, true)

    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = previousOverflow
      opener?.focus?.()
    }
  }, [])

  const weekday = FULL_WEEKDAYS[new Date(year, month, day).getDay()]
  const closeItem = [{
    key: 'close', label: '×', title: 'Close', onClick: onClose,
    fallbackClass: 'pc-round pc-burgundy', tint: BURGUNDY_TINT,
  }]

  return createPortal(
    <div
      className="pc-overlay"
      style={{ '--pc-ink': pageInk.ink, '--pc-hi': pageInk.halo }}
      // Only a press on the veil itself counts as "clicking away", not one inside the sheet
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
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
        <div className="pc-sheet-scroll">
          <header className="pc-detail-head">
            <div>
              <h2 className="pc-detail-dow">{weekday}</h2>
              <p className="pc-detail-date">{day} {MONTHS[month]} {year}</p>
              <p className="pc-detail-meta">
                Day {dayOfYear(year, month, day)} of {daysInYear(year)} · {photoCountLabel(srcs.length)}
              </p>
            </div>
            <GlassButtons items={closeItem} material={CLOSE_MATERIAL} />
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
      {viewing !== null && (
        <PhotoViewer srcs={srcs} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />
      )}
    </div>,
    document.body,
  )
}
