/**
 * The text under the calendar: a hint while it is empty, and a short note on
 * where the photos live.
 */
import { useRef } from 'react'
import { usePageInk } from '../photo-calendar/index.js'
import './library-ui.css'

/**
 * Its text colour follows how dark the page is directly behind it.
 *
 * @param {object} library  the value returned by usePhotoLibrary()
 */
export default function LibraryNote({ library }) {
  const ref = useRef(null)
  const ink = usePageInk(ref)
  const empty = library.photos.length === 0 && library.progress === null
  return (
    <div className="lib-footer" ref={ref} style={{ '--lib-ink': ink.ink }}>
      {empty && <p className="lib-hint">No photos yet. Tap the gear at the top left to import some.</p>}
      <p className="lib-note">Photos stay on this device and are never uploaded. Removing them here does not affect your Photos library.</p>
    </div>
  )
}
