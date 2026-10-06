/** Year view: twelve mini months, with a thumbnail on every day that has photos. */
import { useRef } from 'react'
import usePageInk, { inkVars } from '../hooks/usePageInk.js'
import { MONTHS, dateKey, monthCells, ordinal, photoCountLabel, weekdayLabels } from '../lib/dates.js'
import '../styles/year.css'

/**
 * @param {number} year
 * @param {number} weekStartsOn
 * @param {Map}    byDate
 * @param {string} todayKey
 * @param {string} anim           entry animation name, see useCalendarView
 * @param {Function} onOpenMonth  (month:number) => void, zooms into that month
 */
export default function YearView({ year, weekStartsOn, byDate, todayKey, anim, onOpenMonth }) {
  return (
    <div className={`pc-year-grid pc-in-${anim}`} key={`year-${year}`}>
      {MONTHS.map((name, month) => (
        <MiniMonth
          key={name}
          year={year}
          month={month}
          name={name}
          weekStartsOn={weekStartsOn}
          byDate={byDate}
          todayKey={todayKey}
          onOpen={() => onOpenMonth(month)}
        />
      ))}
    </div>
  )
}

/** One month: name, weekday initials and a grid of small day squares. */
function MiniMonth({ year, month, name, weekStartsOn, byDate, todayKey, onOpen }) {
  const initials = weekdayLabels(weekStartsOn).map(w => w[0])
  const ref = useRef(null)
  const ink = usePageInk(ref) // this month's labels follow what is behind this month
  return (
    <div className="pc-mini" ref={ref} style={inkVars(ink)}>
      <button type="button" className="pc-mini-name" onClick={onOpen} aria-label={`Open ${name} ${year}`}>{name}</button>
      <div className="pc-mini-week" aria-hidden="true">
        {initials.map((w, i) => <span key={i}>{w}</span>)}
      </div>
      <div className="pc-mini-grid" onClick={onOpen}>
        {monthCells(year, month, weekStartsOn).map((day, i) => {
          if (day === null) return <i key={`blank-${i}`} className="pc-mini-blank" />
          const key = dateKey(year, month, day)
          const srcs = byDate.get(key)
          const title = `${ordinal(day)} ${name}${srcs ? `, ${photoCountLabel(srcs.length)}` : ''}`
          return (
            <i key={key} title={title} className={`pc-mini-day${srcs ? ' has' : ''}${key === todayKey ? ' pc-mini-today' : ''}`}>
              {srcs && <img src={srcs[0]} alt="" loading="lazy" decoding="async" draggable="false" />}
            </i>
          )
        })}
      </div>
    </div>
  )
}
