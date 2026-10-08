/**
 * A short hint under the calendar while no photos have been imported yet.
 * (The info note that used to live beside it is now the Info item in the settings menu, see InfoItem.)
 */
import { useRef } from 'react'
import { usePageInk } from '../photo-calendar/index.js'
import './library-ui.css'

/**
 * @param {object} library  the value returned by usePhotoLibrary()
 */
export default function LibraryHint({ library }) {
  const ref = useRef(null)
  const ink = usePageInk(ref)
  const empty = library.photos.length === 0 && library.progress === null
  if (!empty) return null
  return (
    <p className="lib-hint" ref={ref} style={{ '--lib-ink': ink.ink, '--lib-hi': ink.halo }}>
      No photos yet. Tap the + to add some.
    </p>
  )
}
