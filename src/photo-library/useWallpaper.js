/**
 * The page wallpaper as React state.
 *
 * The aim is that the wallpaper is right on the very first frame, with no flash of a different
 * background. Three layers make that work:
 *   1. index.html paints a tiny blurred preview before the app even loads.
 *   2. This hook starts from what localStorage remembers (see wallpaper.js): synchronously it
 *      knows whether there is a custom wallpaper, its average colour, and its preview.
 *   3. The full image then loads (the default from a static file, a custom one from IndexedDB)
 *      and fades in over the preview. Until it is ready, the glass refracts the decoded preview.
 *
 * The default wallpaper is a plain image file (public/wallpaper/default.jpg), drawn once at build
 * time by scripts/gen-default-wallpaper.mjs, so nothing is drawn at launch.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import defaultMeta from './default-wallpaper-meta.json'
import {
  clearWallpaperHint, loadWallpaper, prepareWallpaper, previewOf, readWallpaperHint,
  removeWallpaper, saveWallpaper, writeWallpaperHint,
} from './wallpaper.js'

const DEFAULT_URL = `${import.meta.env.BASE_URL}wallpaper/default.jpg`
const css = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`

/** Loads and decodes an image; resolves with the element even if decoding is refused. */
async function decoded(url) {
  const image = new Image()
  image.src = url
  try { await image.decode() } catch { /* the page still shows it via CSS */ }
  return image
}

/**
 * @returns {{
 *   url: string|null,          URL for the CSS background, or null while a custom one is still loading
 *   image: HTMLImageElement|null,  decoded image for the glass: the preview first, then the full one
 *   fullImage: HTMLImageElement|null,  the full image once it has loaded, else null (what the page paints)
 *   averageCss: string|null,   the wallpaper's average colour (known from the first frame)
 *   isDefault: boolean,        true while the frosted default is showing
 *   busy: boolean,
 *   notice: {id:number, text:string}|null,
 *   setFromFile: (file:File) => Promise<void>,
 *   clear: () => Promise<void>,   goes back to the default
 * }}
 */
export default function useWallpaper() {
  // What the last visit left behind, read synchronously, so the first render is already right
  const [hint] = useState(readWallpaperHint)
  const [wallpaper, setWallpaper] = useState(() => hint
    ? { url: null, image: null, averageCss: hint.average, isDefault: false }
    : { url: DEFAULT_URL, image: null, averageCss: defaultMeta.averageCss, isDefault: true })
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [version, setVersion] = useState(0) // bumped to reload from storage
  const currentUrl = useRef(null)

  // The preview is a few KB, so it decodes at once; the glass uses it until the full image is ready
  useEffect(() => {
    let live = true
    decoded(hint?.preview ?? defaultMeta.preview).then(image => { if (live) setPreview(image) })
    return () => { live = false }
  }, [hint])

  useEffect(() => {
    let live = true
    loadWallpaper().catch(() => undefined).then(async record => { // storage unavailable (private mode): default
      if (!live) return
      let next
      if (record) {
        const url = URL.createObjectURL(record.blob)
        const image = await decoded(url)
        if (!live) { URL.revokeObjectURL(url); return }
        const averageCss = css(record.average)
        next = { url, image, averageCss, isDefault: false }
        // Make sure the next launch can paint instantly, even if the hint was cleared meanwhile
        if (!readWallpaperHint()) writeWallpaperHint({ preview: previewOf(image), average: averageCss })
      } else {
        clearWallpaperHint() // a hint with nothing behind it would show a wallpaper that is gone
        next = { url: DEFAULT_URL, image: await decoded(DEFAULT_URL), averageCss: defaultMeta.averageCss, isDefault: true }
        if (!live) return
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
      const { blob, average, preview } = await prepareWallpaper(file)
      await saveWallpaper({ blob, average, name: file.name })
      writeWallpaperHint({ preview, average: css(average), top: undefined, bottom: undefined })
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
    clearWallpaperHint()
    setVersion(v => v + 1)
    tell('Wallpaper reset')
  }, [])

  // Until the full image is ready, hand the glass the decoded preview
  return { ...wallpaper, fullImage: wallpaper.image, image: wallpaper.image ?? preview, busy, notice, setFromFile, clear }
}
