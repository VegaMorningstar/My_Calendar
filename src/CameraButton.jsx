/**
 * The camera button, under the calendar panel at the right (level with the photo count): take a photo and it is added to the calendar
 * on the day it was taken. What a press does depends on the device (see useCameraCapture): a camera inside the page drawn like the
 * phone's own, or a Polaroid on a computer.
 *
 * It is a Write-With-Nature glass tile with a drawn camera over it, like the gear.
 */
import { useRef } from 'react'
import { BUTTON_MATERIAL, GlassButtons, usePageInk } from './photo-calendar/index.js'
import useCameraCapture from './useCameraCapture.jsx'
import './photo-library/library-ui.css'

const MATERIAL = { ...BUTTON_MATERIAL, size: 44, radius: 22, edge: 10 }
/** On the day sheet the glass is frosted like the sheet's close button: the wallpaper blurred, no tint, and no date photos in what it refracts. */
const FROSTED = { tintStrength: 0, blur: 4, edgeBlurMultiplier: 0 }

/**
 * @param {(files: File[]) => void} onFiles  gets the photo; pass the library's addFiles
 * @param {boolean} [frosted]  drawn as on the day sheet (see FROSTED)
 */
export default function CameraButton({ onFiles, frosted = false }) {
  const slotRef = useRef(null)
  const ink = usePageInk(slotRef)
  const camera = useCameraCapture(onFiles)

  return (
    <div className="lib-camera">
      {camera.ui}
      <div className="lib-camera-slot" ref={slotRef} style={{ '--lib-ink': ink.ink }}>
        <GlassButtons
          material={frosted ? { ...MATERIAL, ...FROSTED } : MATERIAL}
          showPhotos={!frosted}
          items={[{ key: 'camera', label: '', title: 'Take a photo', width: MATERIAL.size, onClick: camera.open, fallbackClass: 'lib-gear' }]}
        />
        {/* A camera, drawn over the tile, centred; taps pass through to the tile underneath */}
        <svg className="lib-gear-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8.5A2 2 0 0 1 5 6.5h2l1.4-2h7.2l1.4 2h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <circle cx="12" cy="13" r="3.6" />
        </svg>
      </div>
    </div>
  )
}
