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
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GlassButtons, LiquidGlassPanel, usePanelGlass } from '../wwn-glass/index.js'
import { FULL_WEEKDAYS, MONTHS, dayOfYear, daysInYear, ordinal, photoCountLabel } from '../lib/dates.js'
import PhotoViewer from './PhotoViewer.jsx'
import usePageInk from '../hooks/usePageInk.js'
import usePanelEdge from '../hooks/usePanelEdge.js'
import usePinchZoom from '../hooks/usePinchZoom.js'
import { CLOSE_MATERIAL, NAV_MATERIAL, PANEL_FALLBACK } from '../lib/glass-config.js'
import '../styles/base.css'
import '../styles/detail.css'

/** How much the sheet's glass blurs the wallpaper behind its middle (the calendar panel uses 1.2). */
const SHEET_BLUR = 5

/**
 * The glass buttons on the sheet are frosted like the sheet itself: the wallpaper behind them blurred as much, and no
 * date photos in what they refract. They have no tint at all, so the glass is clear and only the white glyph is on it.
 */
const SHEET_BUTTON_BLUR = 4
/** The glyphs on these buttons are pure white on any wallpaper. */
const WHITE_INK = { letterR: 255, letterG: 255, letterB: 255, letterLightR: 255, letterLightG: 255, letterLightB: 255 }

/** A horizontal drag longer than this many px (and mostly sideways) changes day. */
const SWIPE_PX = 70

/**
 * @param {{year:number, month:number, day:number}} date  the day to show
 * @param {string[]} srcs          the day's photos (previews, if there are any)
 * @param {Map<string,string|Function>} [fullBySrc]  preview URL -> full-size URL (or a function making it) for the viewer
 * @param {boolean}  hasPrev       an earlier date with photos exists
 * @param {boolean}  hasNext       a later date with photos exists
 * @param {Function} onStep        (delta:-1|1) => void, go to the previous / next such date
 * @param {Function} onClose       () => void
 */
export default function DayDetail({ date, srcs, fullBySrc, hasPrev, hasNext, onStep, onClose }) {
  const { year, month, day } = date
  const sheetRef = useRef(null)
  // Text colours follow what is behind the sheet, which is not what is behind the calendar
  const pageInk = usePageInk(sheetRef)
  const glassEdge = usePanelEdge(sheetRef)
  // Frostier than the calendar panel: more blur in the middle, so the text and photos on the sheet stay clear
  const sheetGlass = useMemo(() => ({ ...glassEdge, blur: SHEET_BLUR }), [glassEdge])
  const scrollRef = useRef(null)
  const overlayRef = useRef(null)
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
    // Tells the page a day is open, so it can clear the calendar and the buttons from behind the sheet (see app.css)
    document.documentElement.classList.add('pc-day-open')
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
      document.documentElement.classList.remove('pc-day-open')
      opener?.focus?.()
    }
  }, [])

  // Pinching in anywhere on the day (fingers together on a phone, a trackpad pinch on a laptop) goes back up to the month.
  // Off while a photo is open full screen: pinching there zooms the photo (PhotoViewer).
  usePinchZoom(overlayRef, direction => { if (direction < 0) onClose() }, viewing === null)

  // A new day starts at the top of its photos
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [year, month, day])

  // ── Swipe between days ──────────────────────────────────────────────────────
  const drag = useRef(null)
  const swiped = useRef(false)
  const fingers = useRef(new Set()) // touches currently down: two or more are a pinch, never a swipe
  const wasPinch = useRef(false)
  const onPointerDown = e => {
    fingers.current.add(e.pointerId)
    if (fingers.current.size > 1) wasPinch.current = true
    drag.current = { x: e.clientX, y: e.clientY }; swiped.current = false
  }
  const onPointerUp = e => {
    fingers.current.delete(e.pointerId)
    const start = drag.current
    drag.current = null
    if (wasPinch.current) { if (!fingers.current.size) wasPinch.current = false; return }
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true // so the thumbnail under the finger does not also open
      setTimeout(() => { swiped.current = false }, 400) // a stale flag must not eat a later keyboard activation
      stepDay(dx < 0 ? 1 : -1)
    }
  }

  // A photo's full-size source can be a URL or a function that makes one on first use
  const resolveFull = s => {
    const full = fullBySrc?.get(s)
    return typeof full === 'function' ? full() : full ?? s
  }

  const weekday = FULL_WEEKDAYS[new Date(year, month, day).getDay()]
  // Blurred in the middle, but not at the rim: edgeBlurMultiplier 0 keeps the edge at full sharpness, so it still refracts crisply
  const navMaterial = { ...NAV_MATERIAL, letterSize: 22, ...WHITE_INK, tintStrength: 0, blur: SHEET_BUTTON_BLUR, edgeBlurMultiplier: 0 }
  const closeMaterial = { ...CLOSE_MATERIAL, ...WHITE_INK, tintStrength: 0, blur: SHEET_BUTTON_BLUR, edgeBlurMultiplier: 0 }
  const navItems = [
    { key: 'prev-day', label: '<', title: hasPrev ? 'Previous day with photos' : 'No earlier day', onClick: () => stepDay(-1), fallbackClass: 'pc-round' },
    { key: 'next-day', label: '>', title: hasNext ? 'Next day with photos' : 'No later day', onClick: () => stepDay(1), fallbackClass: 'pc-round' },
  ]
  const closeItem = [{
    key: 'close', label: '×', title: 'Close', onClick: onClose,
    fallbackClass: 'pc-round',
  }]

  return createPortal(
    <div
      className="pc-overlay"
      ref={overlayRef}
      style={{ '--pc-ink': pageInk.ink, '--pc-hi': pageInk.halo, '--pc-veil': pageInk.veil }}
      // Only a press on the veil itself counts as "clicking away", not one inside the sheet
      onMouseDown={e => { if (e.target === e.currentTarget && performance.now() - viewerClosedAt.current > 500) onClose() }}
    >
      <div
        className="pc-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${weekday} ${ordinal(day)} ${MONTHS[month]} ${year}`}
        tabIndex={-1}
      >
        {/* showPhotos off: the sheet covers the calendar, so the date photos must not show through it */}
        <LiquidGlassPanel params={sheetGlass} showPhotos={false} />
        <div
          className="pc-sheet-scroll"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={e => { fingers.current.delete(e.pointerId); drag.current = null; if (!fingers.current.size) wasPinch.current = false }}
          onClickCapture={e => { if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false } }}
        >
          {/* Keyed by date, so every day change replays the slide-in */}
          <div key={`${year}-${month}-${day}`} className={`pc-day-content pc-slide-${slide}`}>
            <header className="pc-detail-head">
              <div>
                <h2 className="pc-detail-dow">{weekday}</h2>
                <p className="pc-detail-date">{ordinal(day)} {MONTHS[month]} {year}</p>
                <p className="pc-detail-meta">
                  Day {dayOfYear(year, month, day)} of {daysInYear(year)} · {photoCountLabel(srcs.length)}
                </p>
              </div>
              <div className="pc-detail-actions">
                <GlassButtons items={navItems} material={navMaterial} showPhotos={false} />
                <GlassButtons items={closeItem} material={closeMaterial} showPhotos={false} />
              </div>
            </header>

            {/* The photos have a scroll area of their own: the date and the buttons above stay put */}
            <div className="pc-gallery-scroll" ref={scrollRef}>
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
      </div>
      {viewing !== null && (
        <PhotoViewer srcs={srcs.map(resolveFull)} index={viewing} onIndex={setViewing} onClose={closeViewer} />
      )}
    </div>,
    document.body,
  )
}
