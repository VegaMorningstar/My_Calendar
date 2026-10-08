/**
 * Full-screen view of one day: the date, and every photo taken on it.
 *
 * Photos show as a grid of square thumbnails; tapping one opens it full screen
 * in PhotoViewer. Moving between days:
 *   Left / Right arrow keys, or a horizontal swipe, or the arrows at the sides of the screen
 *   go to the previous / next date that has photos.
 * Deleting works as in the iPhone Photos app (when the page gives `onDelete`): press and hold a photo and it is selected, every
 * photo of the day shows an empty circle, and a tap on a photo adds it to or takes it off the selection. The header says how many
 * are selected and offers Cancel; a trash button at the bottom is live once something is selected, and asks "Delete N Photos"
 * (or Cancel) before anything goes. A Save button at the bottom left hands over the selected photos at their original size (the share
 * sheet on a phone, where "Save Image" puts them in Photos; downloads on a computer), when the page gives `originalsOf`. Day changes, pinching to the month and the arrows are off while selecting.
 * The dialog closes from the burgundy X, the Escape key, or a click outside the
 * sheet (Escape closes an open photo first). It is rendered in a portal on
 * <body> so it covers the whole viewport whatever the calendar's own layout is,
 * and it puts focus back where it was on close.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GlassButtons, LiquidGlassPanel, usePanelGlass } from '../wwn-glass/index.js'
import { FULL_WEEKDAYS, MONTHS, ordinal } from '../lib/dates.js'
import PhotoViewer from './PhotoViewer.jsx'
import useTimedVisible from '../hooks/useTimedVisible.js'
import SideArrows from './SideArrows.jsx'
import { saveOriginals } from '../lib/saveOriginals.js'
import { useCalendarScript } from '../lib/calendarScript.js'
import usePageInk from '../hooks/usePageInk.js'
import usePanelEdge from '../hooks/usePanelEdge.js'
import usePinchZoom from '../hooks/usePinchZoom.js'
import { CLOSE_MATERIAL, PANEL_FALLBACK } from '../lib/glass-config.js'
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

/** How long (ms) a photo is pressed to select it, and how far (px) the finger may move meanwhile (more is a scroll). */
const HOLD_MS = 450
const HOLD_SLOP_PX = 10
/** How long (ms) deleted photos take to shrink away before they are removed. */
const REMOVE_MS = 220

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
 * @param {(srcs:string[]) => Promise<void>} [onDelete]  removes these photos
 * @param {React.ReactNode} [addSlot]  buttons that add photos to this day (the + and the camera), shown beside the close button; the host passes
 *   them for today and days gone by, not for days to come
 * @param {(srcs:string[]) => File[]} [originalsOf]  the original files of these photos, at once (for Save). Without both this and onDelete there is no selecting.
 */
export default function DayDetail({ date, srcs, fullBySrc, hasPrev, hasNext, onStep, onClose, onDelete, originalsOf, addSlot }) {
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
  /** The photos selected for deletion (their previews' URLs), or null when not selecting. */
  const [selected, setSelected] = useState(null)
  const selecting = selected !== null
  /** The "Delete N Photos" sheet is open. */
  const [confirming, setConfirming] = useState(false)
  /** Photos shrinking away while they are deleted. */
  /** The share sheet or the downloads are in progress. */
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(() => new Set())
  const hold = useRef(null) // the press that may become a hold: { x, y, timer }
  const heldIt = useRef(false) // a hold just selected a photo: the click that follows it must do nothing
  const cancelSelect = () => { setSelected(null); setConfirming(false) }
  const toggle = src => setSelected(cur => { const next = new Set(cur); if (!next.delete(src)) next.add(src); return next })

  // The side arrows show for 3 seconds when the sheet opens and after every change of day, then fade away
  const arrows = useTimedVisible(`${year}-${month}-${day}`, 3000, 3000)
  /** Which way the last move went, so the new day slides in from the right side. */
  const [slide, setSlide] = useState('next')

  /** Go to the previous / next day with photos, if there is one. */
  const stepDay = delta => {
    if (selecting) return
    if (delta < 0 ? !hasPrev : !hasNext) return
    setSlide(delta > 0 ? 'next' : 'prev')
    onStep(delta)
  }

  // The key handler is bound once, so it reads the latest values through a ref
  const latest = useRef({})
  latest.current = { stepDay, onClose, viewing, closeViewer, selected, confirming, cancelSelect, askDelete: () => { if (selected?.size) setConfirming(true) } }

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
      const { stepDay, onClose, viewing, closeViewer, selected, confirming, cancelSelect, askDelete } = latest.current
      if (e.key === 'Escape') {
        e.stopPropagation()
        // One step back per Escape: the delete question, then the selection, then the open photo, then the day
        if (confirming) setConfirming(false)
        else if (selected) cancelSelect()
        else if (viewing !== null) closeViewer()
        else onClose()
      } else if (selected && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.stopPropagation(); e.preventDefault()
        askDelete()
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
  usePinchZoom(overlayRef, direction => { if (direction < 0) onClose() }, viewing === null && !selecting)

  // A new day starts at the top of its photos, with nothing selected
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); setSelected(null); setConfirming(false) }, [year, month, day])

  // A script from the page around the calendar (the guided tour) can open the first photo full screen, or show the photos in
  // selecting mode, so the tour can show what they look like (lib/calendarScript.js). Declared after the reset above.
  const script = useCalendarScript()
  useEffect(() => {
    if (!script) return
    setViewing(script.photo && srcs.length ? 0 : null)
    setSelected(script.select && srcs.length ? new Set([srcs[0]]) : null)
  }, [script, srcs.length]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!start || selecting) return
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

  // ── Press and hold to select ───────────────────────────────────────────────
  const startHold = (e, src) => {
    heldIt.current = false
    if (!(onDelete || originalsOf) || selecting || (e.pointerType === 'mouse' && e.button !== 0)) return
    clearTimeout(hold.current?.timer)
    hold.current = {
      x: e.clientX, y: e.clientY,
      timer: setTimeout(() => { heldIt.current = true; hold.current = null; setSelected(new Set([src])); navigator.vibrate?.(8) }, HOLD_MS),
    }
  }
  const moveHold = e => { if (hold.current && Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > HOLD_SLOP_PX) endHold() }
  const endHold = () => { clearTimeout(hold.current?.timer); hold.current = null }
  useEffect(() => () => clearTimeout(hold.current?.timer), [])
  const onThumbClick = (i, src) => {
    if (heldIt.current) { heldIt.current = false; return } // the press that selected it
    if (selecting) toggle(src)
    else setViewing(i)
  }

  // ── Delete: the photos shrink away, then they are removed; an emptied day closes ──
  const doDelete = async () => {
    const gone = [...selected]
    setConfirming(false)
    setRemoving(new Set(gone))
    await new Promise(r => setTimeout(r, REMOVE_MS))
    try { await onDelete(gone) } finally { setRemoving(new Set()); setSelected(null) }
    if (gone.length >= srcs.length) onClose()
  }
  // ── Save: the originals, at full size. It starts in the tap itself (the originals are already in memory), because the phone only
  //    opens its share sheet for a call made straight from a tap. ──
  const doSave = async () => {
    const files = originalsOf([...selected])
    if (!files.length) return
    setSaving(true)
    try { await saveOriginals(files) } finally { setSaving(false) }
  }
  const countWord = n => `${n} ${n === 1 ? 'Photo' : 'Photos'}`

  const weekday = FULL_WEEKDAYS[new Date(year, month, day).getDay()]
  // Blurred in the middle, but not at the rim: edgeBlurMultiplier 0 keeps the edge at full sharpness, so it still refracts crisply
  const closeMaterial = { ...CLOSE_MATERIAL, ...WHITE_INK, tintStrength: 0, blur: SHEET_BUTTON_BLUR, edgeBlurMultiplier: 0 }
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
      {/* Previous and next day with photos, at the sides of the screen; not while selecting photos (a day change would drop the selection) */}
      {!selecting && (
        <SideArrows
          onPrev={() => stepDay(-1)} onNext={() => stepDay(1)}
          prevLabel={hasPrev ? 'Previous day with photos' : 'No earlier day'} nextLabel={hasNext ? 'Next day with photos' : 'No later day'}
          prevDisabled={!hasPrev} nextDisabled={!hasNext} visible={arrows.visible} onReveal={arrows.reveal}
        />
      )}
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
                {/* Only while selecting photos: how many are selected. (The "Day x of 365, n photos" line is gone.) */}
                {selecting && (
                  <p className="pc-detail-meta" aria-live="polite">{selected.size ? `${countWord(selected.size)} Selected` : 'Select Items'}</p>
                )}
              </div>
              {selecting ? (
                <div className="pc-detail-actions">
                  <button type="button" className="pc-cancel" onClick={cancelSelect}>Cancel</button>
                </div>
              ) : (
                <div className="pc-detail-actions">
                  {/* Add photos to this day: the + and the camera, beside the close button */}
                  {addSlot && <div className="pc-detail-add">{addSlot}</div>}
                  <GlassButtons items={closeItem} material={closeMaterial} showPhotos={false} />
                </div>
              )}
            </header>

            {/* The photos have a scroll area of their own: the date and the buttons above stay put */}
            <div className="pc-gallery-scroll" ref={scrollRef}>
              {/* A day with no photos says so, and points at the buttons that add one */}
              {srcs.length === 0 && <p className="pc-empty-day">{addSlot ? 'No Photos - Import from Photos or Click one' : 'No photos on this day.'}</p>}
              <div className={`pc-gallery${selecting ? ' pc-selecting' : ''}`}>
                {srcs.map((src, i) => {
                  const on = selecting && selected.has(src)
                  return (
                    <button
                      type="button"
                      key={src}
                      className={`pc-thumb${on ? ' pc-thumb-on' : ''}${removing.has(src) ? ' pc-thumb-out' : ''}`}
                      style={{ animationDelay: `${Math.min(i, 16) * 30}ms` }}
                      aria-label={selecting ? `Photo ${i + 1} of ${srcs.length}, ${on ? 'selected' : 'not selected'}` : `Open photo ${i + 1} of ${srcs.length}`}
                      aria-pressed={selecting ? on : undefined}
                      onClick={() => onThumbClick(i, src)}
                      onPointerDown={e => startHold(e, src)}
                      onPointerMove={moveHold}
                      onPointerUp={endHold}
                      onPointerCancel={endHold}
                      onPointerLeave={endHold}
                      // The phone's own press-and-hold menu (save, copy...) must not open over a hold that selects
                      onContextMenu={onDelete || originalsOf ? e => e.preventDefault() : undefined}
                    >
                      <img src={src} alt="" loading="lazy" decoding="async" draggable="false" />
                      {selecting && (
                        <span className="pc-check" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 10 17l8.5-9.5" /></svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        {/* The trash, bottom right, live once something is selected (the Photos app's toolbar) */}
        {selecting && (
          <div className="pc-toolbar">
            {/* Save: bottom left, in the lilac of the Save button on the calendar export page */}
            {originalsOf && (
              <button type="button" className="pc-savebtn" disabled={!selected.size || saving} onClick={doSave} aria-busy={saving} aria-label={selected.size ? `Save ${countWord(selected.size)}` : 'Save'} title="Save at full size">
                {saving ? (
                  <svg className="pc-spin" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3v12" /><path d="m7 10.5 5 5 5-5" /><path d="M4 17.5V20h16v-2.5" />
                  </svg>
                )}
              </button>
            )}
            {onDelete && (
              <button type="button" className="pc-trash" disabled={!selected.size || removing.size > 0} onClick={() => setConfirming(true)} aria-label={selected.size ? `Delete ${countWord(selected.size)}` : 'Delete'} title="Delete">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.2a1.8 1.8 0 0 0 1.8 1.6h6.4a1.8 1.8 0 0 0 1.8-1.6L18 7M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      {/* The question, as in the Photos app: a red Delete over a Cancel, with what it does in plain words */}
      {confirming && selected && (
        <div className="pc-ask" onMouseDown={e => { e.stopPropagation(); if (e.target === e.currentTarget) setConfirming(false) }}>
          <div className="pc-ask-card" role="alertdialog" aria-label={`Delete ${countWord(selected.size)}`}>
            <p className="pc-ask-note">{selected.size === 1 ? 'This photo' : 'These photos'} will be removed from this app. Your Photos library is not affected.</p>
            <button type="button" className="pc-ask-delete" onClick={doDelete} autoFocus>Delete {countWord(selected.size)}</button>
          </div>
          <button type="button" className="pc-ask-cancel" onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      )}
      {viewing !== null && (
        <PhotoViewer srcs={srcs.map(resolveFull)} index={viewing} onIndex={setViewing} onClose={closeViewer} />
      )}
    </div>,
    document.body,
  )
}
