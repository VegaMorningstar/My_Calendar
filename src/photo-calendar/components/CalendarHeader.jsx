/**
 * The calendar's header: the month with the year button beside it (zooming between month and year).
 * Stepping forward and back is done by the arrows at the sides of the screen (SideArrows, rendered by PhotoCalendar).
 */
import { useRef } from 'react'
import { GlassButtons } from '../wwn-glass/index.js'
import usePageInk, { inkVars } from '../hooks/usePageInk.js'
import { MONTHS } from '../lib/dates.js'
import useMediaQuery from '../hooks/useMediaQuery.js'
import { COMPACT_NAV_MATERIAL, COMPACT_QUERY, COMPACT_YEAR_BUTTON_WIDTH, NAV_MATERIAL, YEAR_BUTTON_WIDTH } from '../lib/glass-config.js'

/**
 * @param {{y:number, m:number}} view  the month or year on screen
 * @param {boolean}  isYear            year view rather than month view
 * @param {Function} onToggleZoom      () => void, month view <-> year view
 */
export default function CalendarHeader({ view, isYear, onToggleZoom }) {
  const compact = useMediaQuery(COMPACT_QUERY) // a phone on its side: smaller buttons
  const titleRef = useRef(null)
  const titleInk = usePageInk(titleRef) // the title's colour follows what is behind the title

  // A glass canvas for the year button beside the title, with its own plain-CSS fallback class for browsers without WebGPU.
  const material = compact ? COMPACT_NAV_MATERIAL : NAV_MATERIAL
  const zoomItems = [{
    // In year view the title already says the year, so the button names the month it returns to
    key: 'zoom', label: isYear ? MONTHS[view.m].slice(0, 3) : String(view.y),
    width: compact ? COMPACT_YEAR_BUTTON_WIDTH : YEAR_BUTTON_WIDTH,
    title: isYear ? 'Zoom in to a month' : 'Zoom out to the year',
    onClick: onToggleZoom, fallbackClass: 'pc-round pc-wide',
  }]

  return (
    <header className="pc-head">
      <div className="pc-title" ref={titleRef} style={inkVars(titleInk)}>
        <div className="pc-title-row">
          <h2 className="pc-month">{isYear ? view.y : MONTHS[view.m]}</h2>
          <div className="pc-zoom"><GlassButtons items={zoomItems} material={material} /></div>
        </div>
      </div>
    </header>
  )
}
