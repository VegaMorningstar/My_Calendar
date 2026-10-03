/**
 * The area under the calendar: a hint while it is empty, the small Remove photos
 * button once there are photos, and a short note on where the photos live.
 */
import './library-ui.css'

/**
 * @param {object} library  the value returned by usePhotoLibrary()
 * @param {{ink:string, halo:string}} [ink]  adaptive text colour from the calendar
 */
export default function LibraryNote({ library, ink }) {
  const { photos, progress, removeAll } = library
  const busy = progress !== null
  const hasOwn = photos.length > 0

  const onRemove = () => {
    if (window.confirm(`Remove the ${photos.length} photos you added from this app? Your Photos library is not affected.`)) removeAll()
  }

  return (
    <div className="lib-footer" style={ink ? { '--lib-ink': ink.ink } : undefined}>
      {!hasOwn && !busy && <p className="lib-hint">No photos yet. Import some from your library to fill the calendar.</p>}
      {hasOwn && (
        <button type="button" className="lib-btn lib-small lib-danger" onClick={onRemove} disabled={busy}>
          Remove photos
        </button>
      )}
      <p className="lib-note">Photos stay on this device and are never uploaded. Removing them here does not affect your Photos library.</p>
    </div>
  )
}
