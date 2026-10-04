/**
 * One day in the month grid.
 *
 * A day with photos is a button: it cycles through its photos on a randomised
 * timer, shows its photo count on hover, and opens the full-screen day view on
 * click. A day without photos is a transparent, engraved box showing only the
 * date and weekday, and its text colour follows the brightness of the wallpaper
 * directly behind that one box.
 */
import { useRef } from 'react'
import usePageInk, { namedInkVars } from '../hooks/usePageInk.js'
import usePhotoRotation from '../hooks/usePhotoRotation.js'
import usePhotoInk from '../hooks/usePhotoInk.js'
import { photoCountLabel } from '../lib/dates.js'
import '../styles/month.css'

/** Where the date and the weekday sit in an empty cell, as [left, top, right, bottom] fractions. */
const NUMBER_SPOT = [0, 0, 0.5, 0.4]
const WEEKDAY_SPOT = [0, 0.65, 0.5, 1]

/**
 * @param {number}   day        day of the month
 * @param {string}   weekday    short weekday name, e.g. 'Sat'
 * @param {string}   fullLabel  spoken label, e.g. 'Saturday 3 October'
 * @param {string[]} srcs       URLs of the photos taken on this day
 * @param {boolean}  isToday    draws the teal ring
 * @param {number}   rotateMs   average time each photo stays up
 * @param {*}        pageInk    page ink; a change re-samples the photo text colours
 * @param {Function} onOpen     () => void, opens the day view
 */
export default function DayCell({ day, weekday, fullLabel, srcs, isToday, rotateMs, pageInk, onOpen }) {
  const n = srcs.length
  const cellRef = useRef(null)
  // Empty days measure the wallpaper behind the spot each piece of text sits on (the date
  // top left, the weekday bottom left); photo days colour their text from the photo instead
  const numInk = usePageInk(cellRef, n === 0, NUMBER_SPOT)
  const dowInk = usePageInk(cellRef, n === 0, WEEKDAY_SPOT)
  const index = usePhotoRotation(n, rotateMs)
  const inkVars = usePhotoInk(srcs[index], pageInk)
  const today = isToday ? ' pc-today' : ''

  if (n === 0) {
    return (
      <div className={`pc-day pc-empty${today}`} ref={cellRef} style={{ ...namedInkVars('num', numInk), ...namedInkVars('dow', dowInk) }}>
        <span className="pc-num">{day}</span>
        <span className="pc-dow">{weekday}</span>
      </div>
    )
  }

  const count = photoCountLabel(n)
  return (
    <button
      type="button"
      className={`pc-day pc-photo${today}`}
      style={inkVars || undefined}
      onClick={onOpen}
      aria-label={`${fullLabel}, ${count}. Open`}
    >
      {/* All photos are stacked and crossfaded, so the swap never flashes */}
      {srcs.map((src, i) => (
        <img key={src} src={src} alt="" className={i === index ? 'on' : ''} loading="lazy" decoding="async" draggable="false" />
      ))}
      <span className="pc-num">{day}</span>
      <span className="pc-dow">{weekday}</span>
      <span className="pc-badge" aria-hidden="true">{count}</span>
    </button>
  )
}
