/**
 * A small camera inside the page, for computers (a phone has its own, see PhoneCamera).
 *
 * Drawn as a Polaroid: a white frame with the live picture in it and, in the thick strip underneath, today's date in italics, as if
 * written on the print, with little flowers and doodles around the frame (CameraFlorals). The picture is not cropped, so what is shown is exactly what is saved. The round button below the frame
 * takes the picture and hands it back as a JPEG file named for the moment it was
 * taken (so it lands on today's date). The camera is switched off as soon as the dialog closes, whichever way it closes.
 */
import { useEffect, useRef, useState } from 'react'
import { BUTTON_MATERIAL, GlassButtons } from './photo-calendar/index.js'
import CameraFlorals from './CameraFlorals.jsx'
import { captureFrame, useCameraStream } from './useCameraStream.js'
import './camera.css'

/** The shutter: a round WWN glass tile, 64px, with the white ring drawn over it. */
/** Whether the picture is turned left to right is remembered on the device. A laptop camera's picture is not turned by the page, and some cameras turn it themselves, so the person decides. */
const FLIP_KEY = 'mycal.camFlip'
const savedFlip = () => { try { return localStorage.getItem(FLIP_KEY) === '1' } catch { return false } }

const SHUTTER_MATERIAL = { ...BUTTON_MATERIAL, size: 64, radius: 32, edge: 11 }

/** '6 October 2026': the date written on the print. */
export const printDate = (d = new Date()) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * @param {(file: File) => void} onPhoto  called with the picture that was taken
 * @param {() => void} onClose
 */
export default function CameraDialog({ onPhoto, onClose }) {
  const videoRef = useRef(null)
  const [saveError, setSaveError] = useState(false)
  const [flipped, setFlipped] = useState(savedFlip) // the picture is shown, and saved, turned left to right
  const [today, setToday] = useState(() => printDate())
  // The picture's shape (width over height), so the window in the print is exactly that shape: no bars at the sides or above
  const { state: streamState, message: streamMessage, ratio } = useCameraStream(videoRef)
  const state = saveError ? 'error' : streamState
  const message = saveError ? 'The photo could not be saved.' : streamMessage

  useEffect(() => {
    // A dialog left open past midnight must still write the right date
    const clock = setInterval(() => setToday(printDate()), 30000)
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => {
      clearInterval(clock)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  const toggleFlip = () => {
    const next = !flipped
    setFlipped(next)
    try { localStorage.setItem(FLIP_KEY, next ? '1' : '0') } catch { /* not saved, still flips */ }
  }

  const shoot = async () => {
    const file = await captureFrame(videoRef.current, 1, flipped)
    if (file) onPhoto(file)
    else if (videoRef.current?.videoWidth) setSaveError(true)
  }

  return (
    <div className="cam-scrim" role="dialog" aria-modal="true" aria-label="Take a photo" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      {/* Close: the top left corner of the screen */}
      <button type="button" className="cam-btn cam-close" onClick={onClose} aria-label="Close the camera" title="Close">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <div className="cam-stack">
        {/* The Polaroid: white frame, the picture, and the date written underneath */}
        <figure className="cam-polaroid" style={{ '--cam-ar': ratio }}>
          <div className="cam-window">
            <video ref={videoRef} className="cam-video" style={flipped ? { transform: 'scaleX(-1)' } : undefined} playsInline muted autoPlay />
            {state !== 'live' && <p className="cam-note" role="status">{state === 'error' ? message : 'Starting the camera...'}</p>}
          </div>
          <figcaption className="cam-date">{today}</figcaption>
          <CameraFlorals />
        </figure>
        <div className="cam-bar">
          {/* The shutter: liquid glass, with a white ring drawn over it like a phone's shutter. While the camera is still starting
              it is dimmed and does nothing (a disabled button does not take a press). */}
          <div className={`cam-shutter-slot${state === 'live' ? '' : ' cam-shutter-off'}`}>
            <GlassButtons
              material={SHUTTER_MATERIAL}
              items={[{
                key: 'shutter', label: '', title: 'Take the photo', width: SHUTTER_MATERIAL.size,
                onClick: shoot, fallbackClass: 'cam-shutter',
                aria: { disabled: state !== 'live' },
              }]}
            />
            <svg className="cam-shutter-ring" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
              <circle cx="32" cy="32" r="27" fill="none" stroke="#fff" strokeWidth="3.5" />
              <circle cx="32" cy="32" r="20.5" fill="rgba(255,255,255,.55)" />
            </svg>
          </div>
          {/* Flip: turns the picture left to right, for the preview and the saved photo alike */}
          <button type="button" className={`cam-btn cam-flipbtn${flipped ? ' cam-flipbtn-on' : ''}`} onClick={toggleFlip} aria-pressed={flipped} aria-label="Flip the picture left to right" title="Flip the picture left to right">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v18" strokeDasharray="2.2 2.6" />
              <path d="M9.5 6.5 3.5 18h6z" />
              <path d="M14.5 6.5 20.5 18h-6z" fill="currentColor" fillOpacity=".45" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
