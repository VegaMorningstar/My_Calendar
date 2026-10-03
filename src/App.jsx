import { useEffect, useState } from 'react'
import { PhotoCalendar } from './photo-calendar/index.js'

export default function App() {
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}photos/manifest.json`)
      .then(r => r.json())
      .then(list => setPhotos(list.map(p => `${import.meta.env.BASE_URL}${p}`)))
      .catch(() => {})
  }, [])

  return (
    <main className="stage">
      <PhotoCalendar photos={photos} />
    </main>
  )
}
