/**
 * The camera for phones and tablets, drawn like the phone's own Camera app, but with the picture filling the whole screen: close at
 * the top left, flash at the top right, the zoom stops in a pill above the shutter, and along the bottom, over the picture, the last
 * photo taken at the left, the big white shutter in the middle and flip (front or back camera) at the right.
 *
 * It is drawn by the page, not by the phone, because the phone's own camera screen (what a file picker with `capture` opens) cannot be
 * changed: it carries its own "PHOTO" label and controls. Each press of the shutter hands the picture back (to be added to the calendar
 * on today's date) and the camera stays open for more; the close button, or a tap on the last photo, finishes.
 * What is saved is exactly what is shown: the picture is cut to the view's shape and zoom (see captureFrame).
 *
 * Double-tapping the picture flips between the front and back camera, as in the phone's own app.
 *
 * Zoom: the stops are the phone's real lenses where it shows them to the page (0.5 is the ultra wide camera) and a digital 2x;
 * pinching zooms in smoothly up to 10x. Zooming within a lens is instant; changing lens or flipping restarts the camera, which
 * takes a moment, so the last frame stays on screen, blurred, until the new one is ready.
 * Flash: Auto, On or Off. The front camera uses the screen as its flash (a white screen while the picture is taken). The back
 * camera uses the torch where the browser lets a page switch it on; iPhone's browser does not, so there the button is not shown.
 * "Auto" fires only when the picture is dark.
 */
import { useEffect, useRef, useState } from 'react'
import { viewportDeficit } from './diagnostics.js'
import { listLenses } from './cameraLenses.js'
import { captureFrame, useCameraStream } from './useCameraStream.js'
import './phone-camera.css'

/** How long (ms) the flash is on before the picture is taken, so the camera has time to adjust to it. */
const FLASH_LEAD_MS = 380
/** The picture counts as dark (flash fires in Auto) when its average brightness, out of 255, is below this. */
const DARK_BELOW = 70
/** The most the picture can be zoomed in, as the number the pill shows (10 means 10x). */
const MAX_ZOOM = 10
/** Two taps within this many ms, and this many px of each other, are a double tap; a tap moves less than TAP_SLOP_PX. */
const DOUBLE_TAP_MS = 320
const DOUBLE_TAP_PX = 40
const TAP_SLOP_PX = 12
const FLASH_KEY = 'mycal.camFlash'
const FLASH_NEXT = { auto: 'on', on: 'off', off: 'auto' }
const FLASH_WORD = { auto: 'Auto', on: 'On', off: 'Off' }

const wait = ms => new Promise(r => setTimeout(r, ms))
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
/** 0.5 -> '.5', 1 -> '1', 2.34 -> '2.3': the numbers on the zoom pill. */
const zoomWord = z => String(Math.round(z * 10) / 10).replace(/^0\./, '.')

function savedFlash() {
  try { const v = localStorage.getItem(FLASH_KEY); return FLASH_NEXT[v] ? v : 'auto' } catch { return 'auto' }
}

/** True when the picture now showing is dark: its average brightness over a tiny copy of the frame. */
function isDark(video) {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, 16, 16)
    const px = ctx.getImageData(0, 0, 16, 16).data
    let sum = 0
    for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
    return sum / 256 < DARK_BELOW
  } catch { return false }
}

/**
 * @param {(file: File) => void} onPhoto  called with each picture taken
 * @param {() => void} onClose
 * @param {() => void} [onFallback]  opens the phone's own camera app instead; offered when this camera cannot start
 */
export default function PhoneCamera({ onPhoto, onClose, onFallback }) {
  const videoRef = useRef(null)
  const snapRef = useRef(null)
  const [lens, setLens] = useState('main') // 'main' and 'ultra' are on the back; 'front' is the selfie camera
  const [deviceId, setDeviceId] = useState(null) // a particular lens, once the phone has said what it has
  const [lenses, setLenses] = useState(null)
  const [zoom, setZoom] = useState(1) // as the pill shows it: .5 is the ultra wide at no digital zoom
  const [flashMode, setFlashMode] = useState(savedFlash)
  const [screenFlash, setScreenFlash] = useState(false) // the white screen that lights a selfie
  const [snap, setSnap] = useState(null) // while a camera restarts: the transform of the frozen last frame
  const [deficit, setDeficit] = useState(viewportDeficit) // the strip an installed iPhone app cannot paint below the page, in px
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(0) // changes with every shot, to replay the quick white flash
  const [thumb, setThumb] = useState(null) // an object URL for the last photo taken

  const front = lens === 'front'
  const { state, message, track } = useCameraStream(videoRef, { facing: front ? 'user' : 'environment', deviceId, wide: true })
  const lensZoom = lens === 'ultra' ? 0.5 : 1 // what the lens itself shows, with no digital zoom
  const digital = zoom / lensZoom
  const videoTransform = `scale(${front ? -digital : digital}, ${digital})` // the front camera's preview is mirrored, as in the phone's own app
  const torch = !!track?.getCapabilities?.().torch
  const flashAvailable = front || torch
  const stops = front || !lenses?.ultra ? [1, 2] : [0.5, 1, 2]

  // The phone names its cameras once one is live
  useEffect(() => {
    if (state === 'live' && !lenses) listLenses().then(setLenses)
  }, [state, lenses])

  // The strip some iPhones leave below an installed app can only show the page's background colour: black, so it joins the camera
  useEffect(() => {
    const html = document.documentElement
    const meta = document.querySelector('meta[name="theme-color"]')
    const before = { bg: html.style.background, theme: meta?.getAttribute('content') }
    const black = () => { html.style.background = '#000'; meta?.setAttribute('content', '#000000') }
    black()
    const onResize = () => { black(); setDeficit(viewportDeficit()) } // the page repaints its wallpaper when the screen turns; this runs after it
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      html.style.background = before.bg
      if (before.theme != null) meta?.setAttribute('content', before.theme)
    }
  }, [])

  // Escape closes; a thumbnail's URL is let go when it is replaced and when the camera closes
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  useEffect(() => () => { if (thumb) URL.revokeObjectURL(thumb) }, [thumb])

  // The frozen frame goes once the new camera is showing (or has failed)
  useEffect(() => {
    if (!snap) return
    if (state === 'error') { setSnap(null); return }
    if (state !== 'live') return
    const t = setTimeout(() => setSnap(null), 140)
    return () => clearTimeout(t)
  }, [snap, state])

  /** Keeps the last frame on screen, blurred, while the camera restarts. */
  const freeze = () => {
    const v = videoRef.current, c = snapRef.current
    if (!v?.videoWidth || !c) return
    c.width = Math.round(v.videoWidth / 6)
    c.height = Math.round(v.videoHeight / 6)
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    setSnap({ transform: videoTransform })
  }
  const switchLens = (target, z) => {
    freeze()
    setLens(target)
    setDeviceId(lenses?.[target] ?? null)
    setZoom(z)
  }
  const flip = () => switchLens(front ? 'main' : 'front', 1)
  const zoomTo = z => {
    const target = front ? 'front' : z < 1 && lenses?.ultra ? 'ultra' : 'main'
    if (target !== lens) switchLens(target, z)
    else setZoom(z)
  }
  const cycleFlash = () => {
    const next = FLASH_NEXT[flashMode]
    setFlashMode(next)
    try { localStorage.setItem(FLASH_KEY, next) } catch { /* not saved, still works */ }
  }

  // Two fingers on the picture zoom it. The ultra wide only goes up to the main lens's width; the main lens to MAX_ZOOM.
  const fingers = useRef(new Map())
  const pinch = useRef(null)
  const tapStart = useRef(null) // the one finger now down on the picture, if it could still turn out to be a tap
  const lastTap = useRef(null) // the previous tap, for spotting a double tap
  const gap = () => { const [a, b] = [...fingers.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }
  const onDown = e => {
    if (e.target.closest('button')) return
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // One finger could be a tap; a second finger makes it a pinch instead
    tapStart.current = fingers.current.size === 1 ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null
    if (fingers.current.size === 2) pinch.current = { d0: gap() || 1, z0: zoom }
  }
  const onMove = e => {
    if (!fingers.current.has(e.pointerId)) return
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && fingers.current.size === 2) setZoom(clamp(pinch.current.z0 * gap() / pinch.current.d0, lensZoom, lens === 'ultra' ? 1 : MAX_ZOOM))
  }
  const onUp = e => {
    const tap = tapStart.current
    tapStart.current = null
    // A short press that stayed put is a tap; two close together, in the same place, flip the camera (not while one is restarting)
    if (e.type === 'pointerup' && tap && fingers.current.size === 1 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < TAP_SLOP_PX && e.timeStamp - tap.t < 300) {
      const prev = lastTap.current
      if (prev && e.timeStamp - prev.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_TAP_PX) {
        lastTap.current = null
        if (!snap && state === 'live') flip()
      } else lastTap.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    }
    fingers.current.delete(e.pointerId)
    if (fingers.current.size < 2) pinch.current = null
  }

  const shoot = async () => {
    const v = videoRef.current
    if (busy || state !== 'live' || !v) return
    setBusy(true)
    const fire = flashAvailable && flashMode !== 'off' && (flashMode === 'on' || isDark(v))
    try {
      if (fire) {
        if (front) setScreenFlash(true)
        else await track.applyConstraints({ advanced: [{ torch: true }] }).catch(() => {})
        await wait(FLASH_LEAD_MS)
      }
      const file = await captureFrame(v, digital)
      if (file) {
        setFlash(n => n + 1)
        setThumb(URL.createObjectURL(file))
        onPhoto(file)
      }
    } finally {
      if (fire) {
        if (front) setScreenFlash(false)
        else track?.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {})
      }
      setBusy(false)
    }
  }

  // The stop nearest the current zoom shows the exact number, in yellow, like the phone's own pill
  const nearest = stops.reduce((best, s) => Math.abs(s - zoom) < Math.abs(best - zoom) ? s : best, stops[0])

  return (
    <div className="pcam" role="dialog" aria-modal="true" aria-label="Take a photo">
      <div className="pcam-view" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <video ref={videoRef} className="pcam-video" style={{ transform: videoTransform }} playsInline muted autoPlay />
        <canvas ref={snapRef} className={`pcam-snap${snap ? ' pcam-snap-on' : ''}`} style={{ transform: snap?.transform }} aria-hidden="true" />
        {state !== 'live' && !snap && (
          <div className="pcam-note" role="status">
            <p>{state === 'error' ? message : 'Starting the camera...'}</p>
            {state === 'error' && onFallback && <button type="button" className="pcam-link" onClick={onFallback}>Open the camera app instead</button>}
          </div>
        )}
        {flash > 0 && <div key={flash} className="pcam-flash" aria-hidden="true" />}

        <button type="button" className="pcam-round pcam-close" onClick={onClose} aria-label="Close the camera" title="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        {flashAvailable && (
          <button type="button" className="pcam-round pcam-flashbtn" onClick={cycleFlash} aria-label={`Flash: ${FLASH_WORD[flashMode]}. Tap to change.`} title={`Flash: ${FLASH_WORD[flashMode]}`}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill={flashMode === 'on' ? '#ffd60a' : 'none'} stroke={flashMode === 'on' ? '#ffd60a' : 'currentColor'} strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
              <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />
              {flashMode === 'off' && <path d="M4 4l16 16" strokeLinecap="round" />}
            </svg>
            {flashMode === 'auto' && <span className="pcam-flash-a" aria-hidden="true">A</span>}
          </button>
        )}

        <div className="pcam-zoom" role="group" aria-label="Zoom">
          {stops.map(s => (
            <button key={s} type="button" className={`pcam-stop${s === nearest ? ' pcam-stop-on' : ''}`} onClick={() => zoomTo(s)} aria-label={`Zoom ${zoomWord(s)} times`} aria-pressed={s === nearest}>
              {s === nearest ? `${zoomWord(zoom)}×` : zoomWord(s)}
            </button>
          ))}
        </div>
      </div>
      <div className="pcam-bar">
        {thumb
          ? <button type="button" className="pcam-thumb" onClick={onClose} aria-label="Done, back to the calendar" title="Done"><img src={thumb} alt="" /></button>
          : <span className="pcam-thumb-gap" />}
        <button type="button" className="pcam-shutter" onClick={shoot} disabled={state !== 'live' || busy} aria-label="Take the photo" title="Take the photo"><span /></button>
        <button type="button" className="pcam-round pcam-flip" onClick={flip} aria-label="Switch between the front and back camera" title="Switch camera">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 11a8 8 0 0 0-14.3-4.6M4 13a8 8 0 0 0 14.3 4.6" /><path d="M6 3v4.4h4.4M18 21v-4.4h-4.4" />
          </svg>
        </button>
      </div>
      {/* Where there is such a strip it can only be plain black, so the picture fades into black down to it and the two read as one */}
      {deficit >= 20 && <div className="pcam-fade" style={{ height: deficit + 110 }} aria-hidden="true" />}
      {screenFlash && <div className="pcam-screenflash" aria-hidden="true" />}
    </div>
  )
}
