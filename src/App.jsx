/**
 * The demo page: a gear at the top left (photos and wallpaper settings), the
 * photo calendar, and a short note under it.
 *
 * The calendar shows whatever photos the user has imported from their device,
 * on top of the wallpaper they chose (or the plain page colour).
 */
import { useEffect } from 'react'
import { PhotoCalendar, setBackgroundImage } from './photo-calendar/index.js'
import { LibraryNote, SettingsMenu, usePhotoLibrary, useWallpaper } from './photo-library/index.js'

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
      <div className="stage-toolbar">
        <SettingsMenu library={library} wallpaper={wallpaper} />
      </div>
      <div className="stage-column">
        <PhotoCalendar photos={library.photos} />
        <LibraryNote library={library} />
      </div>
    </main>
  )
}
