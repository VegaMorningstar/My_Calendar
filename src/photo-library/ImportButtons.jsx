/**
 * The two small buttons under the calendar, Import photos (Add more photos once
 * there are some) and Remove photos, side by side, plus the toast that reports
 * what happened.
 *
 * "Import photos" opens the system photo picker, so the user decides exactly
 * which photos to add. Nothing is read until they pick. Photos are stored on
 * this device only. Progress and results appear in a toast: progress stays up
 * while photos are being added, and the result vanishes after three seconds.
 */
import { useEffect, useRef, useState } from 'react'
import Toast from './Toast.jsx'
import './library-ui.css'

/** How long a result toast stays up, in ms. */
const TOAST_MS = 3000

/**
 * @param {object} library   the value returned by usePhotoLibrary()
 * @param {{ink:string, halo:string}} [ink]  adaptive text colours from the calendar
 */
export default function ImportButtons({ library, ink }) {
  const { photos, progress, lastResult, addFiles, removeAll } = library
  const input = useRef(null)
  const busy = progress !== null
  const hasOwn = photos.length > 0

  // The toast shows progress while adding, then the result for TOAST_MS
  const [toastOpen, setToastOpen] = useState(false)
  useEffect(() => {
    if (busy) { setToastOpen(true); return }
    if (!lastResult) { setToastOpen(false); return }
    setToastOpen(true)
    const timer = setTimeout(() => setToastOpen(false), TOAST_MS)
    return () => clearTimeout(timer)
  }, [busy, lastResult])
  const toastText = busy ? `Adding ${progress.done} of ${progress.total}...` : lastResult ? summary(lastResult) : ''

  const onPick = e => {
    const files = [...e.target.files]
    e.target.value = '' // lets the same photos be chosen again later
    if (files.length) addFiles(files)
  }

  const onRemove = () => {
    if (window.confirm(`Remove the ${photos.length} photos you added from this app? Your Photos library is not affected.`)) removeAll()
  }

  return (
    <div className="lib-toolbar" style={ink ? { '--lib-ink': ink.ink } : undefined}>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={onPick} />

      <button type="button" className="lib-btn lib-small lib-primary" onClick={() => input.current.click()} disabled={busy}>
        {hasOwn ? 'Add more photos' : 'Import photos'}
      </button>
      {hasOwn && (
        <button type="button" className="lib-btn lib-small lib-danger" onClick={onRemove} disabled={busy}>
          Remove photos
        </button>
      )}

      <Toast text={toastText} open={toastOpen} />
    </div>
  )
}

/** One sentence describing what an import did. */
function summary({ added, skipped, failed, undated, removed }) {
  if (removed !== undefined) return `Removed ${removed} ${removed === 1 ? 'photo' : 'photos'} from this app`
  const parts = [`Added ${added} ${added === 1 ? 'photo' : 'photos'}`]
  if (undated) parts.push(`${undated} had no capture date, so the file date was used`)
  if (skipped) parts.push(`${skipped} already added`)
  if (failed) parts.push(`${failed} could not be read`)
  return parts.join(', ')
}
