/**
 * The strip under the calendar for adding the user's own photos.
 *
 * "Choose photos" opens the system photo picker, so the user decides exactly
 * which photos to add. Nothing is read until they pick. Photos are stored on
 * this device only.
 */
import { useRef } from 'react'
import './import-bar.css'

/**
 * @param {object} library   the value returned by usePhotoLibrary()
 * @param {{ink:string, halo:string}} [ink]  adaptive text colours from the calendar
 */
export default function ImportBar({ library, ink }) {
  const { photos, progress, lastResult, addFiles, removeAll } = library
  const input = useRef(null)
  const busy = progress !== null
  const hasOwn = photos.length > 0

  const onPick = e => {
    const files = [...e.target.files]
    e.target.value = '' // lets the same photos be chosen again later
    if (files.length) addFiles(files)
  }

  const onRemove = () => {
    if (window.confirm(`Remove the ${photos.length} photos you added from this device? Your Photos library is not touched.`)) removeAll()
  }

  return (
    <div className="lib-bar" style={ink ? { '--lib-ink': ink.ink } : undefined}>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={onPick} />

      <div className="lib-actions">
        <button type="button" className="lib-btn lib-primary" onClick={() => input.current.click()} disabled={busy}>
          {hasOwn ? 'Import photos' : 'Choose photos'}
        </button>
        {hasOwn && (
          <button type="button" className="lib-btn lib-danger" onClick={onRemove} disabled={busy}>
            Remove my photos
          </button>
        )}
      </div>

      <p className="lib-status" role="status" aria-live="polite">
        {busy
          ? `Adding ${progress.done} of ${progress.total}...`
          : lastResult
            ? summary(lastResult)
            : hasOwn
              ? `${photos.length} photos from your library`
              : 'No photos yet. Choose some from your library to fill the calendar.'}
      </p>
      <p className="lib-note">Photos stay on this device. Nothing is uploaded.</p>
    </div>
  )
}

/** One sentence describing what an import did. */
function summary({ added, skipped, failed, undated }) {
  const parts = [`Added ${added}`]
  if (undated) parts.push(`${undated} had no capture date, so the file date was used`)
  if (skipped) parts.push(`${skipped} already added`)
  if (failed) parts.push(`${failed} could not be read`)
  return parts.join(', ')
}
