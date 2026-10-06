/**
 * The camera button, next to the gear: take a photo and it is added to the calendar on the day it was taken.
 *
 * It is a Write-With-Nature glass tile with a drawn camera over it, like the gear. What a press does depends on the device:
 *   - a phone or tablet (a touch screen): opens the device's own camera app straight away (a file picker with `capture`), and
 *     the picture comes back to the page;
 *   - a computer: opens a small camera inside the page (CameraDialog).
 * Either way the picture goes through the same import as any other photo (usePhotoLibrary's addFiles), so its capture date
 * decides the day: the date written in the photo by the camera, or else the moment it came back, which is now.
 */
import { useCallback, useRef, useState } from 'react'
import { BUTTON_MATERIAL, GlassButtons, usePageInk } from './photo-calendar/index.js'
import CameraDialog, { cameraFileName } from './CameraDialog.jsx'
import './photo-library/library-ui.css'

const MATERIAL = { ...BUTTON_MATERIAL, size: 44, radius: 22, edge: 10 }

/** True on a device whose main pointer is a finger: phones and tablets. */
const isTouchDevice = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

/**
 * @param {(files: File[]) => void} onFiles  gets the photo; pass the library's addFiles
 */
export default function CameraButton({ onFiles }) {
  const slotRef = useRef(null)
  const ink = usePageInk(slotRef)
  const input = useRef(null)
  const [dialog, setDialog] = useState(false)

  const press = () => {
    if (isTouchDevice()) input.current?.click()
    else setDialog(true)
  }
  const closeDialog = useCallback(() => setDialog(false), [])

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

  return (
    <div className="lib-camera">
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onPicked} aria-hidden="true" tabIndex={-1} />
      <div className="lib-camera-slot" ref={slotRef} style={{ '--lib-ink': ink.ink }}>
        <GlassButtons
          material={MATERIAL}
          items={[{ key: 'camera', label: '', title: 'Take a photo', width: MATERIAL.size, onClick: press, fallbackClass: 'lib-gear' }]}
        />
        {/* A camera, drawn over the tile, centred; taps pass through to the tile underneath */}
        <svg className="lib-gear-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8.5A2 2 0 0 1 5 6.5h2l1.4-2h7.2l1.4 2h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <circle cx="12" cy="13" r="3.6" />
        </svg>
      </div>
      {dialog && <CameraDialog onClose={closeDialog} onPhoto={file => { setDialog(false); onFiles([file]) }} />}
    </div>
  )
}
