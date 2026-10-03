/**
 * The demo page: the photo calendar, and the strip for adding your own photos.
 *
 * Until the user adds photos of their own, the calendar shows the bundled sample
 * photos. As soon as they add some, only theirs are shown.
 */
import { useEffect, useState } from 'react'
import { PhotoCalendar, usePageInk } from './photo-calendar/index.js'
import { ImportBar, usePhotoLibrary } from './photo-library/index.js'

export default function App() {
  const [samples, setSamples] = useState([])
  const library = usePhotoLibrary()
  const ink = usePageInk()

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}photos/manifest.json`)
      .then(r => r.json())
      .then(list => setSamples(list.map(p => `${import.meta.env.BASE_URL}${p}`)))
      .catch(() => {})
  }, [])

  const photos = library.photos.length ? library.photos : samples

  return (
    <main className="stage">
      <div className="stage-column">
        <PhotoCalendar photos={photos} />
        <ImportBar library={library} ink={ink} />
      </div>
    </main>
  )
}
