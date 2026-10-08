/**
 * Whether the guided tour is showing, and when it starts by itself.
 *
 * It starts by itself once, the first time the app opens with an empty calendar (a person who already has photos has found their
 * way around), and then whenever "How to use" is chosen in the settings menu. Finishing or skipping it, either way, is remembered
 * on the device so it does not start by itself again. `?tour=1` in the address starts it, for trying it out.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const SEEN_KEY = 'mycal.tourSeen'
/** How long (ms) after the app is ready the first-time tour waits, so the calendar has settled behind it. */
const START_DELAY_MS = 1200

const wasSeen = () => { try { return localStorage.getItem(SEEN_KEY) === '1' } catch { return true } }
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1') } catch { /* not saved: it may show again, harmless */ } }
const forced = () => { try { return new URLSearchParams(window.location.search).get('tour') === '1' } catch { return false } }

/**
 * @param {boolean} ready  the stored photos have loaded
 * @param {boolean} empty  there are no photos yet
 * @returns {{open: boolean, start: () => void, finish: () => void}}
 */
export default function useTour(ready, empty) {
  const [open, setOpen] = useState(false)
  const autoTried = useRef(false) // it starts by itself at most once in a page load

  // The first time: after the photos have loaded and the calendar is empty
  useEffect(() => {
    if (!ready || open || autoTried.current) return
    if (!forced() && (wasSeen() || !empty)) return
    const t = setTimeout(() => { autoTried.current = true; setOpen(true) }, START_DELAY_MS)
    return () => clearTimeout(t)
  }, [ready, empty]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => setOpen(true), [])
  const finish = useCallback(() => { markSeen(); setOpen(false) }, [])
  return { open, start, finish }
}
