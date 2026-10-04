/**
 * The demo page: the photo calendar, and along the bottom left a gear (photos and
 * wallpaper settings) with the info button beside it.
 *
 * The calendar shows whatever photos the user has imported from their device,
 * on top of the wallpaper they chose (or the plain page colour).
 */
import { useEffect } from 'react'
import { PhotoCalendar, setBackgroundImage } from './photo-calendar/index.js'
import { LibraryHint, LibraryNote, SettingsMenu, usePhotoLibrary, useWallpaper } from './photo-library/index.js'

export default function App() {
  const library = usePhotoLibrary()
  const wallpaper = useWallpaper()

  // The glass refracts the wallpaper, not just the page colour, so it is told about it too
  useEffect(() => {
    setBackgroundImage(wallpaper.image, wallpaper.averageCss)
  }, [wallpaper.image, wallpaper.averageCss])

  return (
    <main className="stage">
      {wallpaper.url && (
        <div className="app-wallpaper" key={wallpaper.url} style={{ backgroundImage: `url("${wallpaper.url}")` }} />
      )}
      <div className="stage-column">
        <PhotoCalendar photos={library.photos} />
        <LibraryHint library={library} />
      </div>
      <div className="stage-footer">
        <SettingsMenu library={library} wallpaper={wallpaper} />
        <LibraryNote />
      </div>
    </main>
  )
}
