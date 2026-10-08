/**
 * The guided tour: a dimmed screen with a spotlight on the part of the app being explained, a short card, and Back, Next and a cross to leave.
 *
 * It runs on the real app. Each step sets a "script" (photo-calendar/lib/calendarScript.js) that puts the calendar in the state to
 * show (the year view, today's sheet open, the settings menu open), waits for what it points at to be on screen, and moves the
 * spotlight to it. While it runs, the tour covers the app, so nothing under it can be pressed by accident; it can always be left:
 * the cross on the card, or Escape. Right and Left arrow keys step, Enter goes on.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { setCalendarScript } from '../photo-calendar/index.js'
import { STEPS } from './steps.js'
import './tour.css'

/** Room (px) the spotlight leaves around what it points at. */
const PAD = 8
/** How long (ms) the spotlight takes to move to the next thing. */
const MOVE_MS = 320
/** How long (ms) a step may wait for what it points at to appear. */
const WAIT_MS = 1800

const wait = ms => new Promise(r => setTimeout(r, ms))
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** A selector with `{today}` and `{yesterday}` filled in with those days of the month. */
const fill = sel => sel.replace('{today}', String(new Date().getDate())).replace('{yesterday}', String(new Date(Date.now() - 864e5).getDate()))

/**
 * The rectangles (viewport px) of the elements the targets find, or null if one is missing or still moving. A target is a selector, or
 * { sel, inset } to shrink its rectangle by `inset` px on every side (negative grows it): the glass buttons carry padding for their
 * rim, which would make the spotlight far bigger than the button.
 */
function measure(targets) {
  const rects = []
  for (const t of targets) {
    const { sel, inset = 0 } = typeof t === 'string' ? { sel: t } : t
    const el = document.querySelector(fill(sel))
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return null
    rects.push({ x: r.left + inset, y: r.top + inset, w: r.width - inset * 2, h: r.height - inset * 2 })
  }
  return rects
}
const sameRects = (a, b) => !!a && !!b && a.length === b.length && a.every((r, i) => Math.abs(r.x - b[i].x) < 1 && Math.abs(r.y - b[i].y) < 1 && Math.abs(r.w - b[i].w) < 1 && Math.abs(r.h - b[i].h) < 1)

/** Waits until every target is on screen and has stopped moving (sheets rise in, menus open), then returns their rectangles. */
async function settle(selectors, alive) {
  if (!selectors.length) return []
  const end = performance.now() + WAIT_MS
  let last = null
  while (alive() && performance.now() < end) {
    const now = measure(selectors)
    if (now && sameRects(now, last)) return now
    last = now
    await wait(90)
  }
  return measure(selectors) ?? []
}

const lerp = (a, b, t) => a + (b - a) * t
const lerpRect = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) })

/** The rectangles eased from where they were to where they now should be, so the spotlight glides between steps. */
function useGlide(target) {
  const [rects, setRects] = useState(target)
  const current = useRef(target)
  useEffect(() => {
    const from = current.current
    const n = Math.max(from.length, target.length)
    const centre = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, w: 0, h: 0 })
    const a = Array.from({ length: n }, (_, k) => from[k] ?? centre(target[k]))
    const b = Array.from({ length: n }, (_, k) => target[k] ?? centre(from[k]))
    const t0 = performance.now()
    let raf
    const tick = now => {
      const t = reduced() ? 1 : Math.min(1, (now - t0) / MOVE_MS)
      const e = 1 - Math.pow(1 - t, 3)
      const next = t >= 1 ? target : a.map((r, k) => lerpRect(r, b[k], e))
      current.current = next
      setRects(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return rects
}

const SHIELD = (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 5 6v5.5c0 4.3 2.8 7.7 7 9.5 4.2-1.8 7-5.2 7-9.5V6z" /><path d="m9 12 2.2 2.2L15.2 10" />
  </svg>
)

/**
 * @param {(reason: 'done' | 'skipped') => void} onClose  called when the tour ends: 'done' after the last step, 'skipped' when it is left early
 *   (the cross, or Escape)
 */
export default function Tour({ onClose }) {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const last = i === STEPS.length - 1
  const [targets, setTargets] = useState([])
  const [anchors, setAnchors] = useState([]) // where the gesture hint plays: one place, or several in turn
  const [size, setSize] = useState(() => ({ W: window.innerWidth, H: window.innerHeight }))
  const [cardH, setCardH] = useState(200)
  const cardRef = useRef(null)
  const nextRef = useRef(null)
  const rects = useGlide(targets)

  // Put the calendar in this step's state, wait for what it points at, and measure it. Re-measured now and then while the step
  // is up, because a sheet can still be settling or the window can change. A step can also change itself part way (a `then` list):
  // after a moment it sets a new script and points at something else, for example a tap and then what the tap opens.
  const [phase, setPhase] = useState(0) // 0 the step as written, 1 and on the parts of its `then` list
  useEffect(() => { setPhase(0) }, [i])
  useEffect(() => {
    let live = true
    const phases = [step, ...(step.then ?? [])]
    const shown = phases[phase] ?? step
    setCalendarScript(shown.script)
    ;(async () => {
      let found = await settle(shown.targets, () => live)
      if (!live) return
      // Something below the fold (the bottom buttons on a phone on its side): scroll it into view, then measure again
      const offscreen = shown.targets.filter((_, k) => found[k] && (found[k].y < 0 || found[k].y + found[k].h > window.innerHeight))
      if (offscreen.length) {
        for (const t of offscreen) document.querySelector(fill(typeof t === 'string' ? t : t.sel))?.scrollIntoView({ block: 'center', behavior: 'instant' })
        await wait(120)
        found = await settle(shown.targets, () => live)
        if (!live) return
      }
      setTargets(found)
      const at = shown.gesture ? measure([].concat(shown.at ?? [])) : null
      setAnchors(shown.gesture ? (at ?? (found[0] ? [found[0]] : [])) : [])
    })()
    const again = setInterval(() => {
      const now = measure(shown.targets)
      if (now) setTargets(old => (sameRects(now, old) ? old : now))
    }, 400)
    const nextPhase = phases[phase + 1]
    const later = nextPhase ? setTimeout(() => setPhase(phase + 1), nextPhase.after) : 0
    return () => { live = false; clearInterval(again); clearTimeout(later) }
  }, [i, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // When the tour ends the calendar goes back to normal
  useEffect(() => () => {
    setCalendarScript(null)
    document.querySelector('.stage')?.scrollTo?.({ top: 0 })
  }, [])

  // Window changes, and the card's own height (for placing it)
  useEffect(() => {
    const onResize = () => { setSize({ W: window.innerWidth, H: window.innerHeight }); const now = measure(step.targets); if (now) setTargets(now) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight) }, [i, size])
  useEffect(() => { nextRef.current?.focus({ preventScroll: true }) }, [i])

  const go = d => setI(n => Math.min(STEPS.length - 1, Math.max(0, n + d)))
  const leave = () => onClose('skipped')
  const next = () => (last ? onClose('done') : go(1))

  // Keys belong to the tour while it is up: Escape leaves, the arrows step. Captured, so the calendar behind never sees them.
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') leave()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { if (e.target?.closest?.('button') && e.key === 'Enter') return; next() }
      else if (e.key === 'ArrowLeft') go(-1)
      else return
      e.stopPropagation(); e.preventDefault()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  // Where the card goes: beside the target on a phone on its side; otherwise at the bottom, or the top when the target is low
  // or the card would cover it
  const { W, H } = size
  const compact = H < 520 && W > H
  const box = rects.length ? {
    x0: Math.min(...rects.map(r => r.x)) - PAD, y0: Math.min(...rects.map(r => r.y)) - PAD,
    x1: Math.max(...rects.map(r => r.x + r.w)) + PAD, y1: Math.max(...rects.map(r => r.y + r.h)) + PAD,
  } : null
  let place = 'bottom'
  if (compact) place = box && (box.x0 + box.x1) / 2 > W / 2 ? 'left' : 'right'
  else if (box) {
    const coversBottom = box.y1 > H - cardH - 28
    const fitsTop = box.y0 > cardH + 28
    place = ((box.y0 + box.y1) / 2 > H * 0.55 && fitsTop) || (coversBottom && fitsTop) ? 'top' : 'bottom'
  } else if (step.icon) place = 'center'

  // The part of the step now showing (a step's `then` parts may say something of their own)
  const now = [step, ...(step.then ?? [])][phase] ?? step
  const title = now.title ?? step.title
  const text = now.text ?? step.text

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="How to use">
      {/* Catches every press, so the app under the tour cannot be pressed by accident */}
      <div className="tour-block" />
      {/* The dim is one rectangle with a clear, rounded hole for each spotlight (a mask, so holes that overlap stay clear) */}
      <svg className="tour-dim" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <mask id="tour-holes">
          <rect width={W} height={H} fill="#fff" />
          {rects.map((r, k) => (
            <rect key={k} x={r.x - PAD} y={r.y - PAD} width={Math.max(0, r.w + PAD * 2)} height={Math.max(0, r.h + PAD * 2)} rx={Math.max(0, Math.min(22, (r.w + PAD * 2) / 2, (r.h + PAD * 2) / 2))} fill="#000" />
          ))}
        </mask>
        <rect width={W} height={H} mask="url(#tour-holes)" />
      </svg>
      {anchors.map((a, k) => (
        <span key={`${i}-${phase}-${k}-${Math.round(a.x)}`} className={`tour-hint tour-hint-${now.gesture}`} style={{ left: a.x + a.w / 2, top: a.y + a.h / 2, '--k': k }} aria-hidden="true"><i /><i /></span>
      ))}

      <div key={i} ref={cardRef} className={`tour-card tour-${place}`}>
        <button type="button" className="tour-x" onClick={leave} aria-label="Close the tour" title="Close the tour">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        {step.icon === 'shield' && <div className="tour-icon">{SHIELD}</div>}
        <h2 className="tour-title">{title}</h2>
        <p className="tour-text" aria-live="polite">{text}</p>
        <div className="tour-foot">
          <div className="tour-dots" aria-label={`Step ${i + 1} of ${STEPS.length}`}>
            {STEPS.map((_, k) => <span key={k} className={k === i ? 'on' : k < i ? 'seen' : ''} />)}
          </div>
          <div className="tour-nav">
            {i > 0 && <button type="button" className="tour-back" onClick={() => go(-1)}>Back</button>}
            <button type="button" className="tour-next" onClick={next} ref={nextRef}>{last ? 'Done' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
