/**
 * The demo page: the import buttons at the top left, the photo calendar below,
 * and a short note under it.
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
      <div className="stage-toolbar">
        <ImportButtons library={library} ink={ink} />
      </div>
      <div className="stage-column">
        <PhotoCalendar photos={library.photos} />
        <LibraryNote library={library} ink={ink} />
      </div>
    </main>
  )
}
