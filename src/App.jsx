/**
 * The demo page: the photo calendar, and along the bottom left a gear (photos and
 * wallpaper settings) with the info button beside it.
 *
 * The calendar shows whatever photos the user has imported from their device,
 * on top of the wallpaper they chose (or the plain page colour).
 */
import { useEffect, useState } from 'react'
import { PhotoCalendar, WALLPAPER_OVERSCAN_PX, bottomEdgeColor, setBackgroundImage, topEdgeColor } from './photo-calendar/index.js'
import { LibraryHint, LibraryNote, SettingsMenu, rememberWallpaperEdges, usePhotoLibrary, useWallpaper } from './photo-library/index.js'

/**
 * True when the page runs under the iPhone status bar. Then the top safe-area inset is more
 * than 0: in the old Home Screen mode (and in a browser tab) it is 0, because the page
 * starts below the bar, and a fade placed there would sit on the page and tint the bar grey.
 */
function useRunsUnderStatusBar() {
  const [under, setUnder] = useState(false)
  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top)'
    document.body.appendChild(probe)
    setUnder(parseFloat(getComputedStyle(probe).paddingTop) > 0)
    probe.remove()
  }, [])
  return under
}

/**
 * The colour along the top edge of the wallpaper, kept up to date. iOS 26 tints the status bar
 * from the page's top edge and from the theme-color tag, and since 26.1 it will not draw the
 * page behind the bar in a Home Screen app, so matching that edge is the best way to make the
 * bar blend in. Returns a CSS colour, and also writes it to the theme-color meta tag.
 */
function useTopEdgeColor(wallpaper) {
  const [color, setColor] = useState(null)
  useEffect(() => {
    if (!wallpaper.image) return
    const update = () => {
      const next = topEdgeColor()
      setColor(next)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next)
      // The page behind the wallpaper takes the bottom edge's colour, so anything the wallpaper
      // does not reach (the screen is briefly taller than the page on launch) blends in, not white
      const bottom = bottomEdgeColor()
      document.documentElement.style.background = bottom
      // Remember both edge colours for a custom wallpaper, so the next launch can tint the status
      // bar and the page behind the wallpaper before anything has loaded (see index.html)
      if (!wallpaper.isDefault) rememberWallpaperEdges(next, bottom)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [wallpaper.image, wallpaper.averageCss])
  return color
}

export default function App() {
  const library = usePhotoLibrary()
  const underStatusBar = useRunsUnderStatusBar()
  const wallpaper = useWallpaper()

  // The glass refracts the wallpaper, not just the page colour, so it is told about it too
  useEffect(() => {
    setBackgroundImage(wallpaper.image, wallpaper.averageCss)
  }, [wallpaper.image, wallpaper.averageCss])

  // Once the full wallpaper has faded in, drop the blurred preview that index.html painted first
  useEffect(() => {
    if (!wallpaper.url) return
    const timer = setTimeout(() => document.getElementById('early-wallpaper')?.remove(), 900)
    return () => clearTimeout(timer)
  }, [wallpaper.url])

  // Declared after the effect above, so the glass already knows the wallpaper when this reads it
  const topColor = useTopEdgeColor(wallpaper)

  return (
    <main className="stage">
      {underStatusBar && <div className="app-status-scrim" aria-hidden="true" />}
      {/* A thin strip in the wallpaper's top-edge colour, there for iOS to tint the status bar from.
          Only needed when the page cannot run under the bar; when it does, the strip would show as a band. */}
      {!underStatusBar && topColor && <div className="app-top-strip" style={{ background: topColor }} aria-hidden="true" />}
      {wallpaper.url && (
        <div className="app-wallpaper" key={wallpaper.url} style={{ backgroundImage: `url("${wallpaper.url}")`, height: `calc(100% + ${WALLPAPER_OVERSCAN_PX}px)` }} />
      )}
      <div className="stage-column">
        {/* The hint hangs below the calendar without taking space, so the calendar itself stays centred */}
        <div className="stage-calendar">
          <PhotoCalendar photos={library.photos} />
          <LibraryHint library={library} />
        </div>
      </div>
      <div className="stage-footer">
        <SettingsMenu library={library} wallpaper={wallpaper} />
        <LibraryNote />
      </div>
    </main>
  )
}
