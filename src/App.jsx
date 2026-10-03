/**
 * The demo page: the photo calendar, and the strip for adding your own photos.
 *
 * The calendar shows whatever photos the user has imported from their device.
 */
import { PhotoCalendar, usePageInk } from './photo-calendar/index.js'
import { ImportBar, usePhotoLibrary } from './photo-library/index.js'

export default function App() {
  const library = usePhotoLibrary()
  const ink = usePageInk()

  return (
    <main className="stage">
      <div className="stage-column">
        <PhotoCalendar photos={library.photos} />
        <ImportBar library={library} ink={ink} />
      </div>
    </main>
  )
}
