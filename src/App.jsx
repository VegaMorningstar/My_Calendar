/**
 * The demo page: the photo calendar, the buttons for adding and removing photos
 * under it, and a short note.
 *
 * The calendar shows whatever photos the user has imported from their device.
 */
import { PhotoCalendar, usePageInk } from './photo-calendar/index.js'
import { ImportButtons, LibraryNote, usePhotoLibrary } from './photo-library/index.js'

export default function App() {
  const library = usePhotoLibrary()
  const ink = usePageInk()

  return (
    <main className="stage">
      <div className="stage-column">
        <PhotoCalendar photos={library.photos} />
        <ImportButtons library={library} ink={ink} />
        <LibraryNote library={library} ink={ink} />
      </div>
    </main>
  )
}
