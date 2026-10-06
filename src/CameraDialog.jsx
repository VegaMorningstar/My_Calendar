/**
 * A small camera inside the page, for computers (a phone opens its own camera app instead, see CameraButton).
 *
 * Shows what the camera sees; the round button takes the picture and hands it back as a JPEG file named for the moment it was
 * taken (so it lands on today's date). The camera is switched off as soon as the dialog closes, whichever way it closes.
 */
import { useEffect, useRef, useState } from 'react'
import './camera.css'

const pad = n => String(n).padStart(2, '0')

/** 'camera-2026-10-12-143005.jpg' for now (local time). */
export function cameraFileName(d = new Date()) {
  return `camera-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.jpg`
}

/**
 * @param {(file: File) => void} onPhoto  called with the picture that was taken
 * @param {() => void} onClose
 */
export default function CameraDialog({ onPhoto, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [state, setState] = useState('starting') // starting | live | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setState('error'); setMessage('This browser cannot use a camera here.'); return }
      try {
        // The back camera where there is a choice, at the best size the camera gives
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 4096 }, height: { ideal: 3072 } }, audio: false })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const v = videoRef.current
        v.srcObject = stream
        await v.play().catch(() => {})
        setState('live')
      } catch (e) {
        if (cancelled) return
        setState('error')
        setMessage(e?.name === 'NotAllowedError' ? 'The camera is blocked. Allow it in the browser to take a photo.' : e?.name === 'NotFoundError' ? 'No camera was found on this device.' : 'The camera could not be started.')
      }
    }
    start()
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelled = true
      window.removeEventListener('keydown', onKey, true)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [onClose])

  const shoot = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    const taken = new Date()
    c.toBlob(blob => {
      c.width = c.height = 0
      if (!blob) { setState('error'); setMessage('The photo could not be saved.'); return }
      onPhoto(new File([blob], cameraFileName(taken), { type: 'image/jpeg', lastModified: taken.getTime() }))
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="cam-scrim" role="dialog" aria-modal="true" aria-label="Take a photo" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cam-box">
        <video ref={videoRef} className="cam-video" playsInline muted autoPlay />
        {state !== 'live' && <p className="cam-note" role="status">{state === 'error' ? message : 'Starting the camera...'}</p>}
        <div className="cam-bar">
          <button type="button" className="cam-btn cam-close" onClick={onClose} aria-label="Close the camera" title="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <button type="button" className="cam-shutter" onClick={shoot} disabled={state !== 'live'} aria-label="Take the photo" title="Take the photo" />
          <span className="cam-spacer" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
