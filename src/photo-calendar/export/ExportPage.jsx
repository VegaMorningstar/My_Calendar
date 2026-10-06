/**
 * The page where a month is laid out as a calendar sheet and saved: the wallpaper behind, the month's name, and a box for
 * every day holding one photo. Tap a day to choose which of that day's photos goes on the sheet; Save makes the file.
 *
 * The shuffle button picks a random photo for every day that has more than one, instead of choosing them one by one.
 * Months can be changed on this page too (the arrows, the left and right keys, or a swipe on the sheet); the photo chosen for
 * each day is remembered per month, so going back to a month finds it as it was left.
 *
 * The sheet on the screen is the same drawing that Save writes to the file (drawCalendarPage), just smaller, so what is
 * seen is what is saved. Plain styling like the year view: no glass, everything sits straight on the wallpaper.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import usePageInk from '../hooks/usePageInk.js'
import useSwipeNav from '../hooks/useSwipeNav.js'
import { getBackgroundImage, paperColor } from '../wwn-glass/index.js'
import { MONTHS, dateKey, fullSources, groupByDate, photoCountLabel } from '../lib/dates.js'
import { drawCalendarPage, loadCalendarFonts } from './drawCalendarPage.js'
import { PAGE_SIZES, pageLayout } from './pageLayout.js'
import { deliverFile, renderCalendarFile } from './saveImage.js'
import './export.css'

/** Loads and decodes an image; resolves null if it cannot be read. */
function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * @param {Array} photos  the library's photos, { src, date, full? }
 * @param {number} year   the month to start on
 * @param {number} month  zero-based
 * @param {number} [weekStartsOn]
 * @param {Function} onClose  () => void
 */
export default function ExportPage({ photos, year: startYear, month: startMonth, weekStartsOn = 0, onClose }) {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const ink = usePageInk(rootRef)

  // The sheet starts in the shape of the screen, so it uses it well: upright on a phone held upright, landscape otherwise
  const [view, setView] = useState({ year: startYear, month: startMonth }) // the month on the sheet
  const { year, month } = view
  const [orientation, setOrientation] = useState(() => (window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'))
  const [choice, setChoice] = useState({}) // 'YYYY-MM-DD' -> index into that day's photos, or -1 for none; absent means the first
  const [picking, setPicking] = useState(null) // the day whose photo is being chosen
  const [images, setImages] = useState(() => new Map()) // photo src -> loaded image
  const [fontsReady, setFontsReady] = useState(false)
  const [stage, setStage] = useState({ w: 0, h: 0 })
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(null) // a finished file waiting for a fresh tap before it can be shared

  // This month's photos, by day
  const byDay = useMemo(() => {
    const all = groupByDate(photos)
    const out = new Map()
    const last = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= last; d++) {
      const srcs = all.get(dateKey(year, month, d))
      if (srcs?.length) out.set(d, srcs)
    }
    return out
  }, [photos, year, month])

  const fullBySrc = useMemo(() => fullSources(photos), [photos])

  const chosenSrc = useCallback(day => {
    const srcs = byDay.get(day)
    if (!srcs) return null
    const i = choice[dateKey(year, month, day)] ?? 0
    return i < 0 ? null : srcs[i] ?? null
  }, [byDay, choice, year, month])

  /** Moves the sheet to the previous (-1) or next (+1) month. */
  const step = delta => {
    setPicking(null)
    setStatus('')
    setPending(null)
    setView(v => { const d = new Date(v.year, v.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } })
  }
  const swipe = useSwipeNav(delta => step(delta))

  /** Days of this month with more than one photo: the only ones a shuffle can change. */
  const shufflable = useMemo(() => [...byDay.entries()].filter(([, srcs]) => srcs.length > 1), [byDay])
  const [shuffles, setShuffles] = useState(0) // counts presses, to replay the icon's little turn

  /** A new random photo for every day that has several, never the one it already had. */
  const shuffle = () => {
    setPicking(null)
    setChoice(c => {
      const next = { ...c }
      for (const [day, srcs] of shufflable) {
        const key = dateKey(year, month, day)
        const now = c[key] ?? 0
        let i = Math.floor(Math.random() * (srcs.length - 1))
        if (i >= now && now >= 0) i += 1 // skips the current photo, so a press always changes the day
        next[key] = i
      }
      return next
    })
    setShuffles(n => n + 1)
  }

  // Clear the page behind (the stage, buttons and calendar) and keep the keys to ourselves while this screen is open
  useEffect(() => {
    document.documentElement.classList.add('pc-export-open')
    const onKey = e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.stopPropagation()
        if (picking === null) setView(v => { const d = new Date(v.year, v.month + (e.key === 'ArrowRight' ? 1 : -1), 1); return { year: d.getFullYear(), month: d.getMonth() } })
        return
      }
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (picking !== null) setPicking(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => { document.documentElement.classList.remove('pc-export-open'); window.removeEventListener('keydown', onKey, true) }
  }, [picking, onClose])

  useEffect(() => { loadCalendarFonts().then(() => setFontsReady(true)) }, [])

  // Load the chosen photos
  useEffect(() => {
    let live = true
    for (const day of byDay.keys()) {
      const src = chosenSrc(day)
      if (src && !images.has(src)) loadImage(src).then(img => { if (live && img) setImages(prev => new Map(prev).set(src, img)) })
    }
    return () => { live = false }
  }, [byDay, chosenSrc, images])

  // The room the sheet has
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w: PW, h: PH } = PAGE_SIZES[orientation]
  const cssW = Math.max(0, Math.min(stage.w, (stage.h * PW) / PH))
  const cssH = (cssW * PH) / PW
  const layout = useMemo(() => pageLayout(PW, PH, year, month, weekStartsOn), [PW, PH, year, month, weekStartsOn])

  /** Everything the drawing needs, apart from the size. */
  const drawing = useCallback(() => ({
    year, month, weekStartsOn,
    wallpaper: getBackgroundImage(),
    paper: paperColor(),
    photoFor: day => { const s = chosenSrc(day); return s ? images.get(s) ?? null : null },
  }), [year, month, weekStartsOn, chosenSrc, images])

  // Paint the sheet on the screen
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !cssW || !fontsReady) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    drawCalendarPage(canvas.getContext('2d'), { W: PW, H: PH, scale: canvas.width / PW, ...drawing() })
  }, [cssW, cssH, PW, PH, fontsReady, drawing])

  const save = async () => {
    setBusy(true); setStatus('Making your calendar...'); setPending(null)
    try {
      // The photo chosen for each day, as the url of its full-size original (the preview if there is no original)
      const photosByDay = new Map()
      for (const day of byDay.keys()) {
        const src = chosenSrc(day)
        if (!src) continue
        const full = fullBySrc.get(src)
        photosByDay.set(day, typeof full === 'function' ? full() : full ?? src)
      }
      const file = await renderCalendarFile({
        orientation, ...drawing(), photosByDay,
        previewFor: day => { const s = chosenSrc(day); return s ? images.get(s) ?? null : null },
        onProgress: (n, total) => setStatus(total ? `Preparing your photos, ${n} of ${total}...` : 'Making your calendar...'),
      })
      setStatus('Making your calendar...')
      const result = await deliverFile(file)
      if (result === 'needs-tap') { setPending(file); setStatus('Your calendar is ready.') }
      else if (result === 'cancelled') setStatus('')
      else setStatus(result === 'shared' ? 'Sent to your share sheet.' : `Saved ${file.filename}.`)
    } catch (e) {
      setStatus('Sorry, the calendar could not be made.')
    }
    setBusy(false)
  }
  const sendPending = async () => {
    const result = await deliverFile(pending)
    if (result !== 'needs-tap') { setStatus(result === 'cancelled' ? '' : result === 'shared' ? 'Sent to your share sheet.' : `Saved ${pending.filename}.`); setPending(null) }
  }

  const pick = (day, index) => { setChoice(c => ({ ...c, [dateKey(year, month, day)]: index })); setPicking(null) }
  const pickingSrcs = picking !== null ? byDay.get(picking) ?? [] : []

  return (
    <div className="ec-root" ref={rootRef} style={{ '--pc-ink': ink.ink, '--pc-hi': ink.halo }} role="dialog" aria-modal="true" aria-label="Your calendar">
      <header className="ec-bar">
        <button type="button" className="ec-pill" onClick={onClose}>Back</button>
        <div className="ec-nav">
          <button type="button" className="ec-pill ec-arrow" onClick={() => step(-1)} aria-label="Previous month">&lsaquo;</button>
          <h2 className="ec-title" aria-live="polite">{MONTHS[month]} {year}</h2>
          <button type="button" className="ec-pill ec-arrow" onClick={() => step(1)} aria-label="Next month">&rsaquo;</button>
        </div>
        <button type="button" className="ec-pill ec-save" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
      </header>

      <div className="ec-tools">
        {/* One button for the page's shape: a phone drawn upright or on its side, turning when pressed */}
        <button
          type="button"
          className="ec-pill ec-shape"
          onClick={() => setOrientation(o => (o === 'landscape' ? 'portrait' : 'landscape'))}
          aria-label={`Page shape: ${orientation}. Press for ${orientation === 'landscape' ? 'portrait' : 'landscape'}`}
          title={orientation === 'landscape' ? 'Landscape page. Press for portrait' : 'Portrait page. Press for landscape'}
        >
          <svg className={`ec-phone ec-phone-${orientation}`} viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {/* An upright phone: the body, a speaker slot at the top and the home bar at the bottom */}
            <rect x="6.5" y="2" width="11" height="20" rx="2.6" />
            <path d="M10.5 4.7h3" />
            <path d="M10.5 19.3h3" />
          </svg>
        </button>
        {/* Shuffle: a random photo for every day that has several */}
        <button
          type="button"
          className="ec-pill ec-shape"
          onClick={shuffle}
          disabled={!shufflable.length}
          aria-label="Shuffle the photos"
          title={shufflable.length ? 'Shuffle: a random photo for each day that has several' : 'No day this month has more than one photo'}
        >
          <svg key={shuffles} className={`ec-shuffle${shuffles ? ' ec-shuffle-go' : ''}`} viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7h3.2c2.2 0 3.6 1.1 4.8 3l2 4c1.2 1.9 2.6 3 4.8 3H21" />
            <path d="M18 13.5l3 3-3 3" />
            <path d="M3 17h3.2c1.6 0 2.8-.6 3.8-1.7" />
            <path d="M13.8 8.7c1-1.1 2.2-1.7 3.8-1.7H21" />
            <path d="M18 4l3 3-3 3" />
          </svg>
        </button>
        <p className="ec-hint">{byDay.size ? 'Tap a day to choose its photo' : 'No photos in this month yet'}</p>
      </div>

      <div className="ec-stage" ref={stageRef} {...swipe}>
        <div className="ec-sheet" style={{ width: cssW, height: cssH }}>
          <canvas ref={canvasRef} className="ec-canvas" aria-hidden="true" />
          {layout.tiles.filter(t => byDay.has(t.day)).map(t => (
            <button
              key={t.day}
              type="button"
              className="ec-hit"
              style={{ left: `${(t.x / PW) * 100}%`, top: `${(t.y / PH) * 100}%`, width: `${(t.w / PW) * 100}%`, height: `${(t.h / PH) * 100}%` }}
              aria-label={`${MONTHS[month]} ${t.day}, ${photoCountLabel(byDay.get(t.day).length)}. Choose the photo`}
              onClick={() => setPicking(t.day)}
            />
          ))}
        </div>
      </div>

      <p className="ec-status" role="status" aria-live="polite">
        {status}
        {pending && <button type="button" className="ec-pill" onClick={sendPending}>Save the picture</button>}
      </p>

      {picking !== null && (
        <div className="ec-scrim" onMouseDown={e => { if (e.target === e.currentTarget) setPicking(null) }}>
          <div className="ec-picker" role="dialog" aria-label={`Choose the photo for ${MONTHS[month]} ${picking}`}>
            <h3 className="ec-picker-title">{picking} {MONTHS[month]}: which photo?</h3>
            <div className="ec-thumbs">
              {pickingSrcs.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className="ec-thumb"
                  aria-pressed={(choice[dateKey(year, month, picking)] ?? 0) === i}
                  aria-label={`Photo ${i + 1} of ${pickingSrcs.length}`}
                  onClick={() => pick(picking, i)}
                >
                  <img src={src} alt="" draggable="false" />
                </button>
              ))}
            </div>
            <div className="ec-picker-actions">
              <button type="button" className="ec-pill" aria-pressed={(choice[dateKey(year, month, picking)] ?? 0) === -1} onClick={() => pick(picking, -1)}>No photo</button>
              <button type="button" className="ec-pill" onClick={() => setPicking(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
