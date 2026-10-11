/**
 * Keeps the month panel centred on the screen, top to bottom, in portrait.
 *
 * The calendar's column is centred in the space above the bottom buttons, and the column holds the panel and, beneath it, the
 * photo count and the + and camera buttons, so the panel itself sat above the middle of the screen. This measures where the
 * panel really is and adds top padding to the column (which moves the column's content down by half of it, as it is centred)
 * until the panel's middle is the screen's middle. It never pushes the content into the buttons or makes the page scroll: the
 * padding is held to the free space there is. In landscape it does nothing (the layouts there are tuned to the short height).
 *
 * The padding is set straight on the element, so React does not re-render for it. It follows the layout: the panel resizing
 * (a month with more rows, a window resize), the column resizing and a turn of the screen.
 *
 * @param {{current: HTMLElement|null}} columnRef  the calendar's column (`.stage-column`); needs a `.pc-panel` and a `.stage-calendar` inside
 */
import { useEffect } from 'react'

/** Gap (px) kept between the calendar and the buttons below it when the padding is held back. */
const MIN_GAP = 8

export default function useCenteredCalendar(columnRef) {
  useEffect(() => {
    const column = columnRef.current
    if (!column) return
    const portrait = window.matchMedia('(orientation: portrait)')
    let pad = 0
    let frame = 0
    let rounds = 0

    const setPad = value => { pad = value; column.style.paddingTop = value ? `${value}px` : '' }

    const measure = () => {
      frame = 0
      const panel = column.querySelector('.pc-panel')
      const group = column.querySelector('.stage-calendar')
      const stage = column.closest('.stage')
      // Landscape, or a page that already scrolls (nothing to centre on): no padding
      if (!portrait.matches || !panel || !group || (stage && stage.scrollHeight > stage.clientHeight + 1)) {
        if (pad) setPad(0)
        return
      }
      const box = panel.getBoundingClientRect()
      const delta = window.innerHeight / 2 - (box.top + box.height / 2) // how far the panel's middle is above the screen's middle
      if (Math.abs(delta) < 0.5) return
      // The column centres its content in what the padding leaves, so the content moves by half the padding
      const room = Math.max(0, column.clientHeight - group.offsetHeight - MIN_GAP)
      const next = Math.min(Math.max(pad + 2 * delta, 0), room)
      if (Math.abs(next - pad) < 0.5) return
      setPad(next)
      // The first step lands it; a second settles rounding, and a limit stops any loop
      if (++rounds < 4) schedule(true)
    }
    const schedule = again => {
      if (!again) rounds = 0
      if (!frame) frame = requestAnimationFrame(measure)
    }
    const onChange = () => schedule(false)

    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onChange)
    ro?.observe(column)
    const group = column.querySelector('.stage-calendar')
    if (group) ro?.observe(group)
    const panel = column.querySelector('.pc-panel')
    if (panel) ro?.observe(panel)
    window.addEventListener('resize', onChange)
    portrait.addEventListener?.('change', onChange)
    schedule(false)
    return () => {
      cancelAnimationFrame(frame)
      ro?.disconnect()
      window.removeEventListener('resize', onChange)
      portrait.removeEventListener?.('change', onChange)
      column.style.paddingTop = ''
    }
  }, [columnRef])
}
