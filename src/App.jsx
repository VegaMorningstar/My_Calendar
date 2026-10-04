/**
 * The demo page: the photo calendar, and along the bottom left a gear (photos and
 * wallpaper settings) with the info button beside it.
 *
 * The calendar shows whatever photos the user has imported from their device,
 * on top of the wallpaper they chose (or the plain page colour).
 */
import { useEffect, useState } from 'react'
import { PhotoCalendar, setBackgroundImage } from './photo-calendar/index.js'
import { LibraryHint, LibraryNote, SettingsMenu, usePhotoLibrary, useWallpaper } from './photo-library/index.js'

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

export default function App() {
  const library = usePhotoLibrary()
  const underStatusBar = useRunsUnderStatusBar()
  const wallpaper = useWallpaper()

  // The glass refracts the wallpaper, not just the page colour, so it is told about it too
  useEffect(() => {
    setBackgroundImage(wallpaper.image, wallpaper.averageCss)
  }, [wallpaper.image, wallpaper.averageCss])

  return (
    <main className="stage">
      {underStatusBar && <div className="app-status-scrim" aria-hidden="true" />}
      {wallpaper.url && (
        <div className="app-wallpaper" key={wallpaper.url} style={{ backgroundImage: `url("${wallpaper.url}")` }} />
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
