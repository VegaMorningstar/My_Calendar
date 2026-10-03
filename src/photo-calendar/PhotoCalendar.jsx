/**
 * PhotoCalendar: a month-per-page calendar etched onto a glass panel, where each
 * day shows the photos shot on it.
 *
 *   <PhotoCalendar photos={['photos/sunset_2026-10-03.webp', ...]} />
 *
 * `photos` is a list of URLs whose file names end in YYYY-MM-DD (or YYYYMMDD),
 * or of { src, date: 'YYYY-MM-DD' } objects. This component only wires the
 * pieces together; the work lives in components/, hooks/ and lib/.
 *
 * Props
 *   photos        photo URLs or { src, date } objects
 *   initialDate   Date whose month opens first (default: today)
 *   weekStartsOn  0 = Sunday (default) ... 6 = Saturday
 *   rotateMs      average time each photo stays up on a multi-photo day
 *   className     extra class on the root element
 */
import { useMemo, useRef, useState } from 'react'
import { LiquidGlassPanel, PANEL_GLASS, usePanelGlass } from './wwn-glass/index.js'
import CalendarHeader from './components/CalendarHeader.jsx'
import DayDetail from './components/DayDetail.jsx'
import MonthView from './components/MonthView.jsx'
import YearView from './components/YearView.jsx'
import useCalendarView from './hooks/useCalendarView.js'
import usePageInk from './hooks/usePageInk.js'
import { MONTHS, countInMonth, dateKey, groupByDate } from './lib/dates.js'
import { PANEL_FALLBACK } from './lib/glass-config.js'
import './styles/base.css'

export default function PhotoCalendar({
  photos = [],
  initialDate,
  weekStartsOn = 0,
  rotateMs = 5000,
  className = '',
}) {
  const panelRef = useRef(null)
  const pageInk = usePageInk()
  const byDate = useMemo(() => groupByDate(photos), [photos])

  /** The day open in the full-screen view, as { year, month, day }, or null. */
  const [openDay, setOpenDay] = useState(null)
  // Keyboard shortcuts pause while the day view is open
  const { view, anim, isYear, go, zoom, toggleZoom } = useCalendarView({ initialDate, enabled: !openDay })

  // Hands the panel's surface to the WebGPU glass, or to WWN's CSS glass without it
  usePanelGlass(panelRef, PANEL_FALLBACK)

  const now = new Date()
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate())
  const photoCount = isYear
    ? MONTHS.reduce((n, _, m) => n + countInMonth(byDate, view.y, m), 0)
    : countInMonth(byDate, view.y, view.m)

  return (
    <section
      className={`pc-root ${className}`}
      aria-label="Photo calendar"
      style={{ '--pc-ink': pageInk.ink, '--pc-hi': pageInk.halo }}
    >
      <div className="pc-panel" ref={panelRef}>
        <LiquidGlassPanel params={PANEL_GLASS} />
        <CalendarHeader view={view} isYear={isYear} photoCount={photoCount} onStep={go} onToggleZoom={toggleZoom} />

        {isYear ? (
          <YearView
            year={view.y}
            weekStartsOn={weekStartsOn}
            byDate={byDate}
            todayKey={todayKey}
            anim={anim}
            onOpenMonth={m => zoom('month', m)}
          />
        ) : (
          <MonthView
            year={view.y}
            month={view.m}
            weekStartsOn={weekStartsOn}
            byDate={byDate}
            todayKey={todayKey}
            rotateMs={rotateMs}
            pageInk={pageInk}
            anim={anim}
            onOpenDay={day => setOpenDay({ year: view.y, month: view.m, day })}
          />
        )}
      </div>

      {openDay && (
        <DayDetail
          date={openDay}
          srcs={byDate.get(dateKey(openDay.year, openDay.month, openDay.day)) ?? []}
          pageInk={pageInk}
          onClose={() => setOpenDay(null)}
        />
      )}
    </section>
  )
}
