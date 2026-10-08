/**
 * One day in the month grid.
 *
 * A day with photos is a button: it cycles through its photos on a randomised
 * timer, shows its photo count on hover, and opens the full-screen day view on
 * click. A day without photos is a transparent, engraved box showing only the
 * date and weekday, and its text colour follows the brightness of the wallpaper
 * directly behind that one box. Today and days gone by open the day view even
 * when empty (it is where a photo is added to that day); days still to come do not.
 */
import { useEffect, useRef } from 'react'
import { todayTint } from '../glass-tiles/GlassTileGrid.jsx'
import { useGlassTile } from '../glass-tiles/tilesContext.js'
import usePageInk, { namedInkVars } from '../hooks/usePageInk.js'
import usePhotoRotation from '../hooks/usePhotoRotation.js'
import usePhotoInk from '../hooks/usePhotoInk.js'
import { photoCountLabel } from '../lib/dates.js'
import '../styles/month.css'

/**
 * A little polka dot ribbon bow, tied on today's tile, because today is a gift. Drawn in the corner of the tile where it
 * does not cover the date, with white dots on the pink.
 */
function Ribbon() {
  return (
    <svg className="pc-ribbon" viewBox="0 0 28 22" aria-hidden="true">
      <g fill="#ff6f9c" stroke="rgba(140, 28, 64, .55)" strokeWidth=".5" strokeLinejoin="round">
        <path d="M12.6 12 7.4 21 11.6 18.6 13.8 20.8Z" />
        <path d="M15.4 12 20.6 21 16.4 18.6 14.2 20.8Z" />
        <path d="M14 11C9 3 1 3 2 9 3 15 10 14 14 11Z" />
        <path d="M14 11C19 3 27 3 26 9 25 15 18 14 14 11Z" />
      </g>
      <circle cx="14" cy="11" r="2.7" fill="#e0457b" stroke="rgba(140, 28, 64, .55)" strokeWidth=".5" />
      <g fill="#fff">
        <circle cx="6.2" cy="7.4" r=".95" /><circle cx="9.4" cy="10" r=".85" /><circle cx="4.1" cy="10.4" r=".8" /><circle cx="10.8" cy="6.6" r=".75" />
        <circle cx="21.8" cy="7.4" r=".95" /><circle cx="18.6" cy="10" r=".85" /><circle cx="23.9" cy="10.4" r=".8" /><circle cx="17.2" cy="6.6" r=".75" />
        <circle cx="10.4" cy="17.4" r=".7" /><circle cx="17.6" cy="17.4" r=".7" />
      </g>
    </svg>
  )
}

/** Where the date and the weekday sit in an empty cell, as [left, top, right, bottom] fractions. */
const NUMBER_SPOT = [0, 0, 0.5, 0.4]
const WEEKDAY_SPOT = [0, 0.65, 0.5, 1]

/**
 * @param {number}   day        day of the month
 * @param {string}   weekday    short weekday name, e.g. 'Sat'
 * @param {string}   fullLabel  spoken label, e.g. 'Saturday 3rd October'
 * @param {string[]} srcs       URLs of the photos taken on this day
 * @param {boolean}  isToday    draws the teal ring
 * @param {number}   rotateMs   least time each photo stays up
 * @param {*}        pageInk    page ink; a change re-samples the photo text colours
 * @param {Function} onOpen     () => void, opens the day view
 * @param {boolean}  canOpenEmpty  an empty day is a button too (today and the past)
 */
export default function DayCell({ day, weekday, fullLabel, srcs, isToday, rotateMs, pageInk, onOpen, canOpenEmpty = false }) {
  const n = srcs.length
  const cellRef = useRef(null)
  // Empty days measure the wallpaper behind the spot each piece of text sits on (the date
  // top left, the weekday bottom left); photo days colour their text from the photo instead
  const numInk = usePageInk(cellRef, n === 0, NUMBER_SPOT)
  const dowInk = usePageInk(cellRef, n === 0, WEEKDAY_SPOT)
  const index = usePhotoRotation(n, rotateMs)

  // For the glass tiles: the photo elements, and a crossfade clock, so the glass can draw the same fade the CSS does
  const imgRefs = useRef([])
  const prevIndex = useRef(index)
  const fade = useRef({ from: -1, to: index, t0: 0 })
  useEffect(() => {
    if (prevIndex.current !== index) {
      fade.current = { from: prevIndex.current, to: index, t0: performance.now() }
      prevIndex.current = index
    }
  }, [index])
  const inkVars = usePhotoInk(srcs[index], pageInk)
  const today = isToday ? ' pc-today' : ''

  useGlassTile(cellRef, {
    label: String(day),
    tint: isToday ? todayTint : undefined,
    getLayers: () => {
      const f = fade.current
      const t = Math.min(1, (performance.now() - f.t0) / 800)
      const ready = i => imgRefs.current[i]?.complete && imgRefs.current[i].naturalWidth > 0
      const layers = []
      const fading = f.from >= 0 && t < 1
      if (fading && ready(f.from)) layers.push({ img: imgRefs.current[f.from], alpha: 1 })
      if (ready(f.to)) layers.push({ img: imgRefs.current[f.to], alpha: fading ? t : 1 })
      return layers
    },
  })

  if (n === 0) {
    const inks = { ...namedInkVars('num', numInk), ...namedInkVars('dow', dowInk) }
    if (canOpenEmpty) {
      return (
        <button type="button" className={`pc-day pc-empty${today}`} data-glass-tile="" ref={cellRef} style={inks} onClick={onOpen} aria-label={`${fullLabel}, no photos. Open to add one`}>
          <span className="pc-num">{day}</span>
          <span className="pc-dow">{weekday}</span>
          {isToday && <Ribbon />}
        </button>
      )
    }
    return (
      <div className={`pc-day pc-empty${today}`} data-glass-tile="" ref={cellRef} style={inks}>
        <span className="pc-num">{day}</span>
        <span className="pc-dow">{weekday}</span>
        {isToday && <Ribbon />}
      </div>
    )
  }

  const count = photoCountLabel(n)
  return (
    <button
      type="button"
      ref={cellRef}
      data-glass-tile=""
      className={`pc-day pc-photo${today}`}
      style={inkVars || undefined}
      onClick={onOpen}
      aria-label={`${fullLabel}, ${count}. Open`}
    >
      {/* All photos are stacked and crossfaded, so the swap never flashes */}
      {srcs.map((src, i) => (
        <img key={src} ref={el => { imgRefs.current[i] = el }} src={src} alt="" className={i === index ? 'on' : ''} loading="lazy" decoding="async" draggable="false" />
      ))}
      <span className="pc-num">{day}</span>
      <span className="pc-dow">{weekday}</span>
      <span className="pc-badge" aria-hidden="true">{count}</span>
      {isToday && <Ribbon />}
    </button>
  )
}
