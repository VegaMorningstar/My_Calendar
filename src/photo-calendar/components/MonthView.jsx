/** One month page: the weekday row above a grid of day cells. */
import { useRef } from 'react'
import DayCell from './DayCell.jsx'
import GlassTileGrid from '../glass-tiles/GlassTileGrid.jsx'
import usePageInk, { inkVars } from '../hooks/usePageInk.js'
import { FULL_WEEKDAYS, MONTHS, WEEKDAYS, dateKey, monthCells, weekdayLabels } from '../lib/dates.js'
import '../styles/month.css'

/**
 * @param {number} year
 * @param {number} month          zero-based
 * @param {number} weekStartsOn   0 = Sunday
 * @param {Map}    byDate         'YYYY-MM-DD' -> photo URLs
 * @param {string} todayKey       'YYYY-MM-DD' of today, for the ring
 * @param {number} rotateMs       least time each photo stays up in the cells
 * @param {*}      pageInk        passed through so photo text re-samples on a colour change
 * @param {string} anim           entry animation name, see useCalendarView
 * @param {boolean} liquidTiles   draw the date boxes as WWN liquid glass tiles (falls back to CSS boxes without WebGPU)
 * @param {Function} onOpenDay    (day:number) => void
 */
export default function MonthView({ year, month, weekStartsOn, byDate, todayKey, rotateMs, pageInk, anim, liquidTiles, onOpenDay }) {
  return (
    <>
      <div className="pc-weekdays" aria-hidden="true">
        {weekdayLabels(weekStartsOn).map(w => <WeekdayLabel key={w} name={w} />)}
      </div>

      {/* The grid stays mounted across months (its glass canvas is expensive to rebuild); animKey replays the entry animation */}
      <GlassTileGrid className={`pc-grid pc-in-${anim}`} animKey={`${year}-${month}-${anim}`} enabled={liquidTiles}>
        {monthCells(year, month, weekStartsOn).map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} className="pc-blank" />
          const key = dateKey(year, month, day)
          const weekdayIndex = new Date(year, month, day).getDay()
          return (
            <DayCell
              key={key}
              day={day}
              weekday={WEEKDAYS[weekdayIndex]}
              fullLabel={`${FULL_WEEKDAYS[weekdayIndex]} ${day} ${MONTHS[month]}`}
              srcs={byDate.get(key) ?? []}
              isToday={key === todayKey}
              rotateMs={rotateMs}
              pageInk={pageInk}
              onOpen={() => onOpenDay(day)}
            />
          )
        })}
      </GlassTileGrid>
    </>
  )
}

/** One weekday heading, coloured for the wallpaper directly behind it. */
function WeekdayLabel({ name }) {
  const ref = useRef(null)
  const ink = usePageInk(ref)
  return <span ref={ref} style={inkVars(ink)}>{name}</span>
}
