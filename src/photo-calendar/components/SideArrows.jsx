/**
 * Previous and next, as two plain chevrons at the sides of the screen, level with its middle: no circle, the arrow is the whole
 * button. They are drawn in the page's ink (pure black or white) and wiggle like jelly when hovered, focused or pressed.
 * One look for every place that steps: the month and year panels, the day sheet and the calendar-export page.
 *
 * They are `position: fixed`, so they sit at the screen's sides whatever the panel in front of them is. Keep the panel clear of
 * them with --pc-arrow-room (see arrows.css). Where they are rendered decides what they are drawn over: the day sheet puts them
 * in its own overlay, the calendar puts them in a portal on <body> (the calendar's containment would trap a fixed child).
 */
import '../styles/arrows.css'

const CHEVRON = {
  prev: <path d="M15 4.5 7.5 12l7.5 7.5" />,
  next: <path d="M9 4.5 16.5 12 9 19.5" />,
}

/**
 * @param {Function} onPrev
 * @param {Function} onNext
 * @param {string}   prevLabel     for screen readers and the tooltip, e.g. "Previous month"
 * @param {string}   nextLabel
 * @param {boolean}  [prevDisabled]  there is nothing earlier: the arrow dims and does nothing
 * @param {boolean}  [nextDisabled]
 */
export default function SideArrows({ onPrev, onNext, prevLabel, nextLabel, prevDisabled = false, nextDisabled = false }) {
  const arrow = (side, onClick, label, disabled) => (
    <button
      type="button" className={`pc-arrow pc-arrow-${side}`} onClick={onClick} aria-label={label} title={label}
      aria-disabled={disabled || undefined} data-off={disabled || undefined}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {CHEVRON[side]}
      </svg>
    </button>
  )
  return (
    <>
      {arrow('prev', () => { if (!prevDisabled) onPrev() }, prevLabel, prevDisabled)}
      {arrow('next', () => { if (!nextDisabled) onNext() }, nextLabel, nextDisabled)}
    </>
  )
}
