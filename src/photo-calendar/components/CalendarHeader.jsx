/**
 * The calendar's header: on the left the month with the year button beside it (zooming
 * between month and year) and the photo count beneath, and on the right the glass buttons
 * for stepping forward and back.
 */
import { useRef } from 'react'
import { GlassButtons } from '../wwn-glass/index.js'
import usePageInk, { inkVars } from '../hooks/usePageInk.js'
import { MONTHS } from '../lib/dates.js'
import useMediaQuery from '../hooks/useMediaQuery.js'
import { COMPACT_NAV_MATERIAL, COMPACT_QUERY, COMPACT_YEAR_BUTTON_WIDTH, NAV_MATERIAL, TEAL_TINT, YEAR_BUTTON_WIDTH } from '../lib/glass-config.js'

/**
 * @param {{y:number, m:number}} view  the month or year on screen
 * @param {boolean}  isYear            year view rather than month view
 * @param {Function} onStep            (delta) => void, previous or next
 * @param {Function} onToggleZoom      () => void, month view <-> year view
 */
export default function CalendarHeader({ view, isYear, onStep, onToggleZoom }) {
  const noun = isYear ? 'year' : 'month'
  const compact = useMediaQuery(COMPACT_QUERY) // a phone on its side: smaller buttons
  const titleRef = useRef(null)
  const titleInk = usePageInk(titleRef) // the title's colour follows what is behind the title

  // Two glass canvases: the year button beside the title, and the two arrows on the right.
  // Each item carries its own plain-CSS fallback class for browsers without WebGPU.
  const material = compact ? COMPACT_NAV_MATERIAL : NAV_MATERIAL
  const zoomItems = [{
    // In year view the title already says the year, so the button names the month it returns to
    key: 'zoom', label: isYear ? MONTHS[view.m].slice(0, 3) : String(view.y),
    width: compact ? COMPACT_YEAR_BUTTON_WIDTH : YEAR_BUTTON_WIDTH,
    title: isYear ? 'Zoom in to a month' : 'Zoom out to the year',
    onClick: onToggleZoom, fallbackClass: 'pc-round pc-wide',
  }]
  const stepItems = [
    { key: 'prev', label: '←', title: `Previous ${noun}`, onClick: () => onStep(-1), fallbackClass: 'pc-round' },
    { key: 'next', label: '→', title: `Next ${noun}`, onClick: () => onStep(1), fallbackClass: 'pc-round pc-teal', tint: TEAL_TINT },
  ]

  return (
    <header className="pc-head">
      <div className="pc-title" ref={titleRef} style={inkVars(titleInk)}>
        <div className="pc-title-row">
          <h2 className="pc-month">{isYear ? view.y : MONTHS[view.m]}</h2>
          <div className="pc-zoom"><GlassButtons items={zoomItems} material={material} /></div>
        </div>
      </div>
      <nav className="pc-nav">
        <GlassButtons items={stepItems} material={material} />
      </nav>
    </header>
  )
}
