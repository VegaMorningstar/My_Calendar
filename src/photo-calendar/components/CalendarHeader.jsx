/**
 * The calendar's header: what is being shown on the left, and on the right the
 * glass buttons for zooming between month and year and for stepping forward and
 * back.
 */
import { useRef } from 'react'
import { GlassButtons } from '../wwn-glass/index.js'
import usePageInk, { inkVars } from '../hooks/usePageInk.js'
import { MONTHS, photoCountLabel } from '../lib/dates.js'
import { NAV_MATERIAL, TEAL_TINT, YEAR_BUTTON_WIDTH } from '../lib/glass-config.js'

/**
 * @param {{y:number, m:number}} view  the month or year on screen
 * @param {boolean}  isYear            year view rather than month view
 * @param {number}   photoCount        photos in the visible month or year
 * @param {Function} onStep            (delta) => void, previous or next
 * @param {Function} onToggleZoom      () => void, month view <-> year view
 */
export default function CalendarHeader({ view, isYear, photoCount, onStep, onToggleZoom }) {
  const noun = isYear ? 'year' : 'month'
  const titleRef = useRef(null)
  const titleInk = usePageInk(titleRef) // the title's colour follows what is behind the title

  // One shared glass canvas draws all three buttons; each item carries its own
  // plain-CSS fallback class for browsers without WebGPU.
  const items = [
    {
      key: 'zoom', label: String(view.y), width: YEAR_BUTTON_WIDTH,
      title: isYear ? 'Zoom in to a month' : 'Zoom out to the year',
      onClick: onToggleZoom, fallbackClass: 'pc-round pc-wide',
    },
    { key: 'prev', label: '←', title: `Previous ${noun}`, onClick: () => onStep(-1), fallbackClass: 'pc-round' },
    { key: 'next', label: '→', title: `Next ${noun}`, onClick: () => onStep(1), fallbackClass: 'pc-round pc-teal', tint: TEAL_TINT },
  ]

  return (
    <header className="pc-head">
      <div className="pc-title" ref={titleRef} style={inkVars(titleInk)}>
        {isYear ? (
          <h2 className="pc-month">{view.y}</h2>
        ) : (
          <>
            <h2 className="pc-month">{MONTHS[view.m]}</h2>
            <span className="pc-year">{view.y}</span>
          </>
        )}
        <span className="pc-count">{photoCountLabel(photoCount)}</span>
      </div>
      <nav className="pc-nav">
        <GlassButtons items={items} material={NAV_MATERIAL} />
      </nav>
    </header>
  )
}
