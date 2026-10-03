/**
 * The text under the buttons: a hint while the calendar is empty, and a short
 * note on where the photos live.
 */
import './library-ui.css'

/**
 * @param {object} library  the value returned by usePhotoLibrary()
 * @param {{ink:string, halo:string}} [ink]  adaptive text colour from the calendar
 */
export default function LibraryNote({ library, ink }) {
  const empty = library.photos.length === 0 && library.progress === null
  return (
    <div className="lib-footer" style={ink ? { '--lib-ink': ink.ink } : undefined}>
      {empty && <p className="lib-hint">No photos yet. Import some from your library to fill the calendar.</p>}
      <p className="lib-note">Photos stay on this device and are never uploaded. Removing them here does not affect your Photos library.</p>
    </div>
  )
}
