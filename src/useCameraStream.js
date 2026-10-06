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
 * Runs the camera into `videoRef` while the component is mounted, and switches it off when it unmounts (or when the camera asked for changes).
 * @param {{current: HTMLVideoElement|null}} videoRef
 * @param {object} [options]
 * @param {'environment'|'user'} [options.facing]  the back camera or the front one
 * @param {string|null} [options.deviceId]  one particular camera (a lens); starting by id is quicker than by facing
 * @param {boolean} [options.wide]  ask for the 16:9 format at its largest (3840 x 2160) instead of 4:3: it fills a tall phone screen with hardly any cropping
 * @returns {{state: 'starting'|'live'|'error', message: string, ratio: number, track: MediaStreamTrack|null}}  ratio is the picture's width over its height
 */
export function useCameraStream(videoRef, { facing = 'environment', deviceId = null, wide = false } = {}) {
  const [state, setState] = useState('starting')
  const [message, setMessage] = useState('')
  const [ratio, setRatio] = useState(4 / 3)
  const [track, setTrack] = useState(null)

  useEffect(() => {
    let cancelled = false
    let stream = null
    const v = videoRef.current
    setState('starting')
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setState('error'); setMessage('This browser cannot use a camera here.'); return }
      try {
        // The chosen camera, at the best size it gives
        const size = wide ? { width: { ideal: 3840 }, height: { ideal: 2160 } } : { width: { ideal: 4096 }, height: { ideal: 3072 } }
        const which = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: facing }
        stream = await navigator.mediaDevices.getUserMedia({ video: { ...which, ...size }, audio: false })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        v.srcObject = stream
        await v.play().catch(() => {})
        if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight)
        setTrack(stream.getVideoTracks()[0] ?? null)
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
      setTrack(null)
    }
  }, [videoRef, facing, deviceId, wide])

  return { state, message, ratio, track }
}

/**
 * Cuts the picture now showing in `video` out as a JPEG file named for the moment it was taken, so it lands on today's date.
 * The picture is cut to exactly what the person sees: the video is shown with `object-fit: cover` (so a tall screen crops the
 * sides of a wider picture) and may be zoomed in digitally; both are applied here, at the camera's full resolution.
 * @param {HTMLVideoElement} video
 * @param {number} [digitalZoom]  how far the picture is enlarged on screen (1 = not at all)
 * @returns {Promise<File|null>}  null when there was nothing to take
 */
export function captureFrame(video, digitalZoom = 1) {
  if (!video || !video.videoWidth) return Promise.resolve(null)
  const vw = video.videoWidth, vh = video.videoHeight
  // The part of the picture that shows: the box's own shape, cut from the middle, then narrowed by the zoom
  const boxAspect = (video.clientWidth || vw) / (video.clientHeight || vh)
  let sw = vw, sh = vh
  if (boxAspect > vw / vh) sh = vw / boxAspect; else sw = vh * boxAspect
  sw /= digitalZoom; sh /= digitalZoom
  const sx = (vw - sw) / 2, sy = (vh - sh) / 2
  const c = document.createElement('canvas')
  c.width = Math.round(sw)
  c.height = Math.round(sh)
  c.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height)
  const taken = new Date()
  return new Promise(resolve => {
    c.toBlob(blob => {
      c.width = c.height = 0
      resolve(blob ? new File([blob], cameraFileName(taken), { type: 'image/jpeg', lastModified: taken.getTime() }) : null)
    }, 'image/jpeg', 0.92)
  })
}
