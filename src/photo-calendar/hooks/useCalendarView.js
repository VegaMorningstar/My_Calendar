/**
 * Which month or year the calendar is showing, and how to move around it.
 *
 * Owns the view state, the direction of the last move (so the page can animate
 * the right way) and the keyboard shortcuts:
 *   Left / Right   previous / next month, or year in year view
 *   Esc or y       toggle between month and year view
 * Shortcuts can be switched off, for example while a dialog is open.
 */
import { useEffect, useRef, useState } from 'react'

/**
 * @param {object}  opts
 * @param {Date}    [opts.initialDate]  starting month, defaults to today
 * @param {boolean} [opts.enabled]      whether keyboard shortcuts are live
 */
export default function useCalendarView({ initialDate, enabled = true } = {}) {
  const [start] = useState(() => initialDate ?? new Date())
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth(), mode: 'month' })
  /**
   * 'next' | 'prev' | 'zoom-in' | 'zoom-out': names the entry animation of a page change. Empty at first, so
   * the calendar is simply there when the app opens instead of sliding in.
   */
  const [anim, setAnim] = useState('')

  /** Month view steps a month, year view steps a year. */
  const go = delta => {
    setAnim(delta > 0 ? 'next' : 'prev')
    setView(v => {
      if (v.mode === 'year') return { ...v, y: v.y + delta }
      const d = new Date(v.y, v.m + delta, 1)
      return { ...v, y: d.getFullYear(), m: d.getMonth() }
    })
  }

  /** Switch mode, optionally landing on a particular month. */
  const zoom = (mode, month) => {
    setAnim(mode === 'year' ? 'zoom-out' : 'zoom-in')
    setView(v => ({ ...v, mode, m: month ?? v.m }))
  }
  const toggleZoom = () => zoom(view.mode === 'month' ? 'year' : 'month')

  /** Show a particular month (month view), sliding the way the calendar moved. */
  const goTo = (year, month) => {
    setAnim(year * 12 + month >= view.y * 12 + view.m ? 'next' : 'prev')
    setView({ y: year, m: month, mode: 'month' })
  }

  // The key handler is bound once; a ref keeps it pointed at the latest closures.
  const latest = useRef({})
  latest.current = { go, toggleZoom, enabled }
  useEffect(() => {
    const onKey = e => {
      const { go, toggleZoom, enabled } = latest.current
      if (!enabled) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape' || e.key === 'y') toggleZoom()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { view, anim, isYear: view.mode === 'year', go, zoom, toggleZoom, goTo }
}
