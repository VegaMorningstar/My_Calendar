/**
 * Three sample photos, shown on today's date while the guided tour runs, so a first-time user with an empty calendar still has
 * a day to open and a photo to look at. They are pictures that ship with the app (public/tour/), never saved to the device's
 * storage, and gone when the tour ends.
 */
import { dateKey } from '../photo-calendar/index.js'

const FILES = ['sample-1.jpg', 'sample-2.jpg', 'sample-3.jpg']

/** The sample photos, in the shape the calendar takes: { id, src, full, date }. `file` is null: they cannot be saved or removed. */
export function samplePhotos(today = new Date()) {
  const date = dateKey(today.getFullYear(), today.getMonth(), today.getDate())
  return FILES.map((name, i) => {
    const url = `${import.meta.env.BASE_URL}tour/${name}`
    return { id: `tour-${i + 1}`, src: url, full: () => url, date, file: null }
  })
}
