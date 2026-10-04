/**
 * The user's imported photos as React state.
 *
 * Loads whatever is stored on the device, turns it into the { src, full, date }
 * list PhotoCalendar takes (`full` is a function that makes the full-size URL on first use), and exposes import and remove actions. The blob
 * URLs are revoked whenever the list changes, so memory is released.
 */
import { useCallback, useEffect, useState } from 'react'
import { clearPhotos, getAllPhotos, requestPersistence } from './photo-store.js'
import { importFiles } from './import-photos.js'

/**
 * @returns {{
 *   photos: {src:string, full:string, date:string}[],
 *   ready: boolean,
 *   progress: {done:number, total:number} | null,
 *   lastResult: object | null,
 *   addFiles: (files:File[]) => Promise<void>,
 *   removeAll: () => Promise<void>,
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
            return { src, full, date: r.date }
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

  return { photos, ready, progress, lastResult, addFiles, removeAll }
}
