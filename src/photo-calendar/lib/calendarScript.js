/**
 * A way for the page around the calendar (the guided tour) to drive it.
 *
 * The page sets a "script": the state it wants the calendar's screens to be in, for example the year view, or a day open with
 * its photos selected. The calendar, the day sheet and the settings menu each read the script and put themselves in the state
 * it describes, and go back to normal when it is cleared (set to null). Nothing else uses it, so with no script the calendar
 * behaves as it always does.
 *
 * A script looks like:
 *   { view: 'month' | 'year',  day: true (today's sheet open) | 'yesterday' (yesterday's, which has no photos in the tour),  photo: boolean (its first photo full screen),
 *     select: boolean (its photos in selecting mode),  menu: boolean (the settings menu open),  arrows: boolean (side arrows held on),
 *     export: boolean (the calendar-export page open),  pick: boolean (on it, today's photo chooser open),
 *     choose: number (on it, today's photo set to this one of its photos) }
 */
import { useSyncExternalStore } from 'react'

let script = null
const listeners = new Set()

/** The script now in force, or null. */
export const getCalendarScript = () => script

/** Sets (or, with null, clears) the script, and tells everything that reads it. */
export function setCalendarScript(next) {
  script = next
  listeners.forEach(l => l())
}

/** The script now in force, kept current in a component. */
export function useCalendarScript() {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    getCalendarScript,
  )
}
