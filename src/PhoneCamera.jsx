/**
 * The camera for phones and tablets, drawn like the phone's own Camera app: the live picture fills the top of the screen with
 * rounded bottom corners, a close button at its top left and a flip (front or back camera) button at its bottom left, and below it,
 * on black, the last photo taken at the left and the big white shutter in the middle.
 *
 * It is drawn by the page, not by the phone, because the phone's own camera screen (what a file picker with `capture` opens) cannot be
 * changed: it carries its own "PHOTO" label and controls. Each press of the shutter hands the picture back (to be added to the calendar
 * on today's date) and the camera stays open for more; the close button, or a tap on the last photo, finishes.
 * The picture is not cropped: the view has the camera's own shape, so what is shown is what is saved.
 */
import { useEffect, useRef, useState } from 'react'
import { captureFrame, useCameraStream } from './useCameraStream.js'
import './phone-camera.css'

/**
 * @param {(file: File) => void} onPhoto  called with each picture taken
 * @param {() => void} onClose
 * @param {() => void} [onFallback]  opens the phone's own camera app instead; offered when this camera cannot start
 */
export default function PhoneCamera({ onPhoto, onClose, onFallback }) {
  const videoRef = useRef(null)
  const [facing, setFacing] = useState('environment') // the back camera first, as the phone's own app does
  const { state, message, ratio } = useCameraStream(videoRef, facing)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(0) // changes with every shot, to replay the white flash
  const [thumb, setThumb] = useState(null) // an object URL for the last photo taken

  // Escape closes; a thumbnail's URL is let go when it is replaced and when the camera closes
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  useEffect(() => () => { if (thumb) URL.revokeObjectURL(thumb) }, [thumb])

  const shoot = async () => {
    if (busy || state !== 'live') return
    setBusy(true)
    const file = await captureFrame(videoRef.current)
    if (file) {
      setFlash(n => n + 1)
      setThumb(URL.createObjectURL(file))
      onPhoto(file)
    }
    setBusy(false)
  }

  return (
    <div className="pcam" role="dialog" aria-modal="true" aria-label="Take a photo">
      <div className="pcam-view" style={{ '--pcam-ar': ratio }}>
        {/* The front camera's preview is mirrored, as in the phone's own app; the saved picture is not */}
        <video ref={videoRef} className={`pcam-video${facing === 'user' ? ' pcam-mirror' : ''}`} playsInline muted autoPlay />
        {state !== 'live' && (
          <div className="pcam-note" role="status">
            <p>{state === 'error' ? message : 'Starting the camera...'}</p>
            {state === 'error' && onFallback && <button type="button" className="pcam-link" onClick={onFallback}>Open the camera app instead</button>}
          </div>
        )}
        {flash > 0 && <div key={flash} className="pcam-flash" aria-hidden="true" />}
        <button type="button" className="pcam-round pcam-close" onClick={onClose} aria-label="Close the camera" title="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <button type="button" className="pcam-round pcam-flip" onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')} aria-label="Switch between the front and back camera" title="Switch camera">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 11a8 8 0 0 0-14.3-4.6M4 13a8 8 0 0 0 14.3 4.6" /><path d="M6 3v4.4h4.4M18 21v-4.4h-4.4" />
          </svg>
        </button>
      </div>
      <div className="pcam-bar">
        {thumb
          ? <button type="button" className="pcam-thumb" onClick={onClose} aria-label="Done, back to the calendar" title="Done"><img src={thumb} alt="" /></button>
          : <span className="pcam-thumb-gap" />}
        <button type="button" className="pcam-shutter" onClick={shoot} disabled={state !== 'live'} aria-label="Take the photo" title="Take the photo"><span /></button>
        <span className="pcam-thumb-gap" />
      </div>
    </div>
  )
}
