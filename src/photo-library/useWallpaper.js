/**
 * The page wallpaper as React state.
 *
 * Loads the saved wallpaper from the device (or, if there is none, the frosted
 * default), decodes it into an image the glass can refract, and exposes set and
 * reset actions. `notice` changes whenever
 * something worth telling the user happens, for the toast.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { makeDefaultWallpaper } from './default-wallpaper.js'
import { loadWallpaper, prepareWallpaper, removeWallpaper, saveWallpaper } from './wallpaper.js'

const css = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`

/**
 * @returns {{
 *   url: string|null,          URL for the CSS background (the default, or the user's photo)
 *   image: HTMLImageElement|null,  decoded copy, for the glass to refract
 *   averageCss: string|null,   the wallpaper's average colour
 *   isDefault: boolean,        true while the frosted default is showing
 *   busy: boolean,
 *   notice: {id:number, text:string}|null,
 *   setFromFile: (file:File) => Promise<void>,
 *   clear: () => Promise<void>,   goes back to the default
 * }}
 */
export default function useWallpaper() {
  const [wallpaper, setWallpaper] = useState({ url: null, image: null, averageCss: null, isDefault: true })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [version, setVersion] = useState(0) // bumped to reload from storage
  const currentUrl = useRef(null)

  useEffect(() => {
    let live = true
    loadWallpaper().catch(() => undefined).then(async record => { // storage unavailable (private mode): default
      if (!live) return
      let next
      if (record) {
        const url = URL.createObjectURL(record.blob)
        const image = new Image()
        image.src = url
        try { await image.decode() } catch { /* the page still shows it via CSS */ }
        if (!live) { URL.revokeObjectURL(url); return }
        next = { url, image, averageCss: css(record.average), isDefault: false }
      } else {
        const { url, averageCss } = makeDefaultWallpaper()
        const image = new Image()
        image.src = url
        try { await image.decode() } catch { /* as above */ }
        if (!live) return
        next = { url, image, averageCss, isDefault: true }
      }
      // Free the previous custom wallpaper only once the new state is in place
      const old = currentUrl.current
      currentUrl.current = next.isDefault ? null : next.url
      setWallpaper(next)
      if (old) setTimeout(() => URL.revokeObjectURL(old), 1000)
    })
    return () => { live = false }
  }, [version])

  useEffect(() => () => { if (currentUrl.current) URL.revokeObjectURL(currentUrl.current) }, [])

  const tell = text => setNotice({ id: Date.now(), text })

  const setFromFile = useCallback(async file => {
    setBusy(true)
    try {
      const { blob, average } = await prepareWallpaper(file)
      await saveWallpaper({ blob, average, name: file.name })
      setVersion(v => v + 1)
      tell('Wallpaper set')
    } catch (err) {
      console.warn('Wallpaper could not be set:', err)
      tell('Could not use that photo as wallpaper')
    } finally {
      setBusy(false)
    }
  }, [])

  const clear = useCallback(async () => {
    await removeWallpaper()
    setVersion(v => v + 1)
    tell('Wallpaper reset')
  }, [])

  return { ...wallpaper, busy, notice, setFromFile, clear }
}
