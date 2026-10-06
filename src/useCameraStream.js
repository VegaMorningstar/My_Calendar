/**
 * The camera plumbing shared by the two in-page cameras (CameraDialog for computers, PhoneCamera for phones):
 * starting a live stream in a <video>, following its shape, switching it off, and cutting a still out of it.
 */
import { useEffect, useState } from 'react'

const pad = n => String(n).padStart(2, '0')

/** 'camera-2026-10-12-143005.jpg' for now (local time). */
export function cameraFileName(d = new Date()) {
  return `camera-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.jpg`
}

/** Why a camera could not start, in words for the person using it. */
function failureMessage(e) {
  if (e?.name === 'NotAllowedError') return 'The camera is blocked. Allow it in the browser to take a photo.'
  if (e?.name === 'NotFoundError') return 'No camera was found on this device.'
  return 'The camera could not be started.'
}

/**
 * Runs the camera into `videoRef` while the component is mounted, and switches it off when it unmounts (or when `facing` changes).
 * @param {{current: HTMLVideoElement|null}} videoRef
 * @param {'environment'|'user'} facing  the back camera or the front one
 * @returns {{state: 'starting'|'live'|'error', message: string, ratio: number}}  ratio is the picture's width over its height
 */
export function useCameraStream(videoRef, facing = 'environment') {
  const [state, setState] = useState('starting')
  const [message, setMessage] = useState('')
  const [ratio, setRatio] = useState(4 / 3)

  useEffect(() => {
    let cancelled = false
    let stream = null
    const v = videoRef.current
    setState('starting')
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setState('error'); setMessage('This browser cannot use a camera here.'); return }
      try {
        // The chosen camera, at the best size it gives
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 4096 }, height: { ideal: 3072 } }, audio: false })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        v.srcObject = stream
        await v.play().catch(() => {})
        if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight)
        setState('live')
      } catch (e) {
        if (cancelled) return
        setState('error')
        setMessage(failureMessage(e))
      }
    }
    start()
    // A camera that turns (a tablet, or a phone held on its side) changes shape: follow it
    const onResize = () => { if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight) }
    v?.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      v?.removeEventListener('resize', onResize)
      stream?.getTracks().forEach(t => t.stop())
      if (v) v.srcObject = null
    }
  }, [videoRef, facing])

  return { state, message, ratio }
}

/**
 * Cuts the picture now showing in `video` out as a JPEG file named for the moment it was taken, so it lands on today's date.
 * @param {HTMLVideoElement} video
 * @returns {Promise<File|null>}  null when there was nothing to take
 */
export function captureFrame(video) {
  if (!video || !video.videoWidth) return Promise.resolve(null)
  const c = document.createElement('canvas')
  c.width = video.videoWidth
  c.height = video.videoHeight
  c.getContext('2d').drawImage(video, 0, 0)
  const taken = new Date()
  return new Promise(resolve => {
    c.toBlob(blob => {
      c.width = c.height = 0
      resolve(blob ? new File([blob], cameraFileName(taken), { type: 'image/jpeg', lastModified: taken.getTime() }) : null)
    }, 'image/jpeg', 0.92)
  })
}
