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
import Ribbon from './Ribbon.jsx'
import '../styles/month.css'

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
        <button type="button" className={`pc-day pc-empty${today}`} data-glass-tile="" data-day={day} ref={cellRef} style={inks} onClick={onOpen} aria-label={`${fullLabel}, no photos. Open to add one`}>
          <span className="pc-num">{day}</span>
          <span className="pc-dow">{weekday}</span>
          {isToday && <Ribbon />}
        </button>
      )
    }
    return (
      <div className={`pc-day pc-empty${today}`} data-glass-tile="" data-day={day} ref={cellRef} style={inks}>
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
      data-glass-tile="" data-day={day}
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
