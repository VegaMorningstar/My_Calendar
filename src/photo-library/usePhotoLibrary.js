/**
 * The user's imported photos as React state.
 *
 * Loads whatever is stored on the device, turns it into the { src, full, date }
 * list PhotoCalendar takes (`id` is the stored record's id, `full` is a function that makes the full-size URL on first use), and exposes import and remove actions. The blob
 * URLs are revoked whenever the list changes, so memory is released.
 */
import { useCallback, useEffect, useState } from 'react'
import { clearPhotos, deletePhotos, getAllPhotos, requestPersistence } from './photo-store.js'
import { importFiles } from './import-photos.js'

/**
 * @returns {{
 *   photos: {id:string, src:string, full:Function, date:string}[],
 *   ready: boolean,
 *   progress: {done:number, total:number} | null,
 *   lastResult: object | null,
 *   addFiles: (files:File[]) => Promise<void>,
 *   removeAll: () => Promise<void>,
 *   removePhotos: (srcs:string[]) => Promise<void>,
 * }}
 */
export default function usePhotoLibrary() {
  const [photos, setPhotos] = useState([])
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [version, setVersion] = useState(0) // bumped to reload from storage

  useEffect(() => {
    let live = true
    let urls = []
    getAllPhotos()
      .then(records => {
        if (!live) return
        const list = records
          .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
          .map(r => {
            // The full-size URL is made only when a photo is opened full screen (the calendar calls
            // `full()`), so launching does not create one for every photo in the library
            let fullUrl = null
            const full = () => {
              if (!fullUrl) { fullUrl = URL.createObjectURL(r.blob); urls.push(fullUrl) }
              return fullUrl
            }
            // Without a preview (the browser could not decode it) the full photo stands in
            const src = r.thumb ? URL.createObjectURL(r.thumb) : full()
            if (r.thumb) urls.push(src)
            return { id: r.id, src, full, date: r.date }
          })
        setPhotos(list)
        setReady(true)
      })
      .catch(() => live && setReady(true)) // storage unavailable (private mode): carry on with none
    return () => { live = false; urls.forEach(URL.revokeObjectURL) }
  }, [version])

  const addFiles = useCallback(async files => {
    setLastResult(null)
    setProgress({ done: 0, total: files.length })
    const result = await importFiles(files, (done, total) => setProgress({ done, total }))
    if (result.added) requestPersistence()
    setProgress(null)
    setLastResult(result)
    setVersion(v => v + 1)
  }, [])

  const removeAll = useCallback(async () => {
    const removed = photos.length
    await clearPhotos()
    setLastResult({ removed })
    setVersion(v => v + 1)
  }, [photos.length])

  /**
   * Removes the photos whose previews are `srcs` (what the calendar knows them by) from the device and from the list. The list
   * is trimmed in place rather than reloaded, so the rest of the photos do not flash; the removed previews' URLs are let go
   * with the others at the next reload.
   */
  const removePhotos = useCallback(async srcs => {
    const gone = new Set(srcs)
    const ids = photos.filter(p => gone.has(p.src)).map(p => p.id)
    if (!ids.length) return
    await deletePhotos(ids)
    setPhotos(list => list.filter(p => !gone.has(p.src)))
  }, [photos])

  return { photos, ready, progress, lastResult, addFiles, removeAll, removePhotos }
}
