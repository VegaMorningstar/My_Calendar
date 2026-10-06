/**
 * Pinching the calendar panel zooms between the month and the year, like the Photos app:
 * fingers together (or a pinch-in on a trackpad) zooms out to the year, fingers apart zooms back
 * into the month. It does the same job as the year button.
 *
 * Three sources feed one rule, "one gesture makes one change":
 *   - two fingers on a touch screen (pointer events; the panel has `touch-action: pan-y`, so the
 *     browser leaves a pinch to us instead of zooming the whole page),
 *   - a laptop trackpad pinch, which Chrome and Firefox send as wheel events with ctrlKey set,
 *   - Safari's own gesture events (a trackpad pinch on a Mac, and a finger pinch on iOS).
 * A change fires when the pinch passes a threshold, and further movement is ignored until the
 * gesture ends. Clicks that come out of a pinch's fingers lifting are swallowed.
 */
import { useEffect, useRef } from 'react'

/** The pinch must shrink to this fraction of its starting size to zoom out... */
const IN_RATIO = 0.8
/** ...or grow to this multiple of it to zoom in. */
const OUT_RATIO = 1.25
/** Accumulated trackpad pinch (wheel deltaY) that counts as a pinch. */
const WHEEL_THRESHOLD = 40
/** A gap this long (ms) with no wheel events ends a trackpad pinch. */
const QUIET_MS = 220
/** Two sources can report the same pinch (iOS sends pointer and gesture events); ignore a repeat this soon after a change. */
const REPEAT_MS = 700

/*
 * One pinch changes one level, across every place that listens (the month panel and the day sheet are different elements with
 * their own listeners). After a change nothing else may react until the gesture is over: a trackpad pinch keeps sending events
 * for a while, and once the day sheet has closed they would land on the month panel underneath and zoom on to the year. While
 * locked, any further pinch events (ctrl + wheel) keep the lock alive, so it ends a moment after the last of them.
 */
let locked = false
let unlockTimer = 0
const lockFor = ms => {
  locked = true
  clearTimeout(unlockTimer)
  unlockTimer = setTimeout(() => { locked = false }, ms)
}
if (typeof window !== 'undefined') {
  window.addEventListener('wheel', e => { if (locked && e.ctrlKey) lockFor(QUIET_MS + 80) }, true)
}

/**
 * @param {{current: HTMLElement|null}} ref  the element to listen on
 * @param {(direction: -1 | 1) => void} onPinch  -1 for a pinch in (fingers together: up a level, month to year, day to month),
 *   1 for a pinch out (fingers apart: down a level, year to month, month to day)
 * @param {boolean} [enabled]  false makes the hook ignore everything, for a layer that has gestures of its own on top of it
 *   (the photo viewer, inside the day sheet)
 */
export default function usePinchZoom(ref, onPinch, enabled = true) {
  const callback = useRef(onPinch)
  callback.current = onPinch
  const active = useRef(enabled)
  active.current = enabled

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let lastFired = 0
    const fire = direction => {
      if (!active.current || locked) return
      const now = performance.now()
      if (now - lastFired < REPEAT_MS) return
      lastFired = now
      lockFor(REPEAT_MS)
      callback.current(direction)
    }
    const swallowClicksBriefly = () => { swallowUntil = performance.now() + 400 }
    let swallowUntil = 0

    // ── Two fingers ──
    const touches = new Map() // pointerId -> { x, y }
    let startDistance = 0
    let spent = false
    const distance = () => {
      const [a, b] = [...touches.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const onDown = e => {
      if (!active.current || e.pointerType === 'mouse') return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) { startDistance = distance(); spent = false }
    }
    const onMove = e => {
      if (!touches.has(e.pointerId)) return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size !== 2 || spent || startDistance < 20) return
      const ratio = distance() / startDistance
      if (ratio <= IN_RATIO) { spent = true; swallowClicksBriefly(); fire(-1) }
      else if (ratio >= OUT_RATIO) { spent = true; swallowClicksBriefly(); fire(1) }
    }
    const onUp = e => {
      if (touches.size === 2) swallowClicksBriefly() // the fingers lifting must not tap a date box
      touches.delete(e.pointerId)
    }
    const onClick = e => {
      if (!active.current || performance.now() > swallowUntil) return
      e.stopPropagation()
      e.preventDefault()
    }

    // ── Trackpad pinch (Chrome, Firefox): wheel events with ctrlKey ──
    let travelled = 0
    let wheelSpent = false
    let timer = 0
    const onWheel = e => {
      if (!active.current || !e.ctrlKey) return
      e.preventDefault() // otherwise the browser zooms the whole page
      clearTimeout(timer)
      timer = setTimeout(() => { travelled = 0; wheelSpent = false }, QUIET_MS)
      if (wheelSpent) return
      travelled += e.deltaY
      if (Math.abs(travelled) < WHEEL_THRESHOLD) return
      wheelSpent = true
      fire(travelled > 0 ? -1 : 1) // positive deltaY is a pinch in
    }

    // ── Safari's gesture events ──
    let gestureSpent = false
    const onGestureStart = e => { if (!active.current) return; e.preventDefault(); gestureSpent = false }
    const onGestureChange = e => {
      if (!active.current) return
      e.preventDefault()
      if (gestureSpent) return
      if (e.scale <= IN_RATIO) { gestureSpent = true; swallowClicksBriefly(); fire(-1) }
      else if (e.scale >= OUT_RATIO) { gestureSpent = true; swallowClicksBriefly(); fire(1) }
    }
    const onGestureEnd = e => { if (active.current) e.preventDefault() }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('click', onClick, true)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', onGestureStart)
    el.addEventListener('gesturechange', onGestureChange)
    el.addEventListener('gestureend', onGestureEnd)
    return () => {
      clearTimeout(timer)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('click', onClick, true)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', onGestureStart)
      el.removeEventListener('gesturechange', onGestureChange)
      el.removeEventListener('gestureend', onGestureEnd)
    }
  }, [ref])
}
