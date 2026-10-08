/**
 * Taking a photo with the camera, for any button that wants to offer it (the camera button under the calendar, the "Add a photo to
 * today" sheet). Returns `open`, which starts the right camera for the device, and `ui`, the pieces that must be on the page for it
 * to work (the camera screens and the hidden file input of the phone's own camera app); render `ui` once, anywhere.
 *
 *   - a phone or tablet (a touch screen): a camera inside the page drawn like the phone's own (PhoneCamera). The phone's own camera
 *     screen (a file picker with `capture`) cannot be restyled, so it is only the fallback, offered when the in-page camera cannot
 *     start or when the browser has no camera access at all;
 *   - a computer: a small camera inside the page, drawn as a Polaroid (CameraDialog).
 * Either way the picture goes to `onFiles`, which is the same import as any other photo, so its capture date decides the day: the
 * date written in the photo by the camera, or else the moment it came back, which is now.
 */
import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CameraDialog from './CameraDialog.jsx'
import PhoneCamera from './PhoneCamera.jsx'
import { cameraFileName } from './useCameraStream.js'

/** True on a device whose main pointer is a finger: phones and tablets. */
const isTouchDevice = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

/**
 * @param {(files: File[]) => void} onFiles  gets the photo; pass the library's addFiles
 * @returns {{open: () => void, ui: import('react').ReactNode}}
 */
export default function useCameraCapture(onFiles) {
  const input = useRef(null)
  const [dialog, setDialog] = useState(null) // which in-page camera is open: null, 'phone' or 'desktop'

  const open = () => {
    if (!isTouchDevice()) setDialog('desktop')
    else if (navigator.mediaDevices?.getUserMedia) setDialog('phone')
    else input.current?.click() // no camera access from the page: the phone's own camera app
  }
  const closeDialog = useCallback(() => setDialog(null), [])
  // Called from a tap, which the phone requires before it will open its camera app
  const useCameraApp = () => { input.current?.click(); setDialog(null) }

  const onPicked = e => {
    const file = e.target.files?.[0]
    e.target.value = '' // so taking another photo, even the same file name, is noticed
    if (!file) return
    // Phones often name every capture "image.jpg": give each its own name so one cannot be mistaken for another
    const named = /^(image|photo)\.\w+$/i.test(file.name)
      ? new File([file], cameraFileName(new Date(file.lastModified || Date.now())), { type: file.type || 'image/jpeg', lastModified: file.lastModified || Date.now() })
      : file
    onFiles([named])
  }

  const ui = (
    <>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onPicked} aria-hidden="true" tabIndex={-1} />
      {/* In the page itself, not inside the calendar: the calendar contains fixed-position children, which would trap the dialog in it */}
      {dialog === 'desktop' && createPortal(<CameraDialog onClose={closeDialog} onPhoto={file => { setDialog(null); onFiles([file]) }} />, document.body)}
      {/* The phone camera stays open after a shot, for more; it closes with its own close button */}
      {dialog === 'phone' && createPortal(<PhoneCamera onClose={closeDialog} onPhoto={file => onFiles([file])} onFallback={useCameraApp} />, document.body)}
    </>
  )
  return { open, ui }
}
