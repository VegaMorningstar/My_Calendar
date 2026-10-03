/**
 * PhotoCalendar: a month-per-page calendar etched onto a glass panel, where each
 * day shows the photos shot on it.
 *
 *   <PhotoCalendar photos={['photos/sunset_2026-10-03.webp', ...]} />
 *
 * `photos` is a list of URLs whose file names end in YYYY-MM-DD (or YYYYMMDD),
 * or of { src, date: 'YYYY-MM-DD', full? } objects. `full` is an optional
 * full-size URL for the full-screen viewer, when `src` is a small preview. This component only wires the
 * pieces together; the work lives in components/, hooks/ and lib/.
 *
 * Props
 *   photos        photo URLs or { src, date, full? } objects
 *   initialDate   Date whose month opens first (default: today)
 *   weekStartsOn  0 = Sunday (default) ... 6 = Saturday
 *   rotateMs      average time each photo stays up on a multi-photo day
 *   className     extra class on the root element
 */
import { useMemo, useRef, useState } from 'react'
import { LiquidGlassPanel, usePanelGlass } from './wwn-glass/index.js'
import CalendarHeader from './components/CalendarHeader.jsx'
import DayDetail from './components/DayDetail.jsx'
import MonthView from './components/MonthView.jsx'
import YearView from './components/YearView.jsx'
import useCalendarView from './hooks/useCalendarView.js'
import usePageInk from './hooks/usePageInk.js'
import usePanelEdge from './hooks/usePanelEdge.js'
import { MONTHS, countInMonth, dateKey, fullSources, groupByDate } from './lib/dates.js'
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
  const pageInk = usePageInk(panelRef) // text colours follow what is behind the panel
  const glassEdge = usePanelEdge(panelRef) // a rim in pixels that stays clear of the date boxes
  const byDate = useMemo(() => groupByDate(photos), [photos])
  const fullBySrc = useMemo(() => fullSources(photos), [photos])

  /** The day open in the full-screen view, as { year, month, day }, or null. */
  const [openDay, setOpenDay] = useState(null)
  // Keyboard shortcuts pause while the day view is open
  const { view, anim, isYear, go, zoom, toggleZoom, goTo } = useCalendarView({ initialDate, enabled: !openDay })

  /** Every date that has photos, oldest first: the stops for the day view's previous / next. */
  const photoDays = useMemo(() => [...byDate.keys()].sort(), [byDate])
  const openKey = openDay && dateKey(openDay.year, openDay.month, openDay.day)
  const openPos = openKey ? photoDays.indexOf(openKey) : -1

  /** Moves the day view to the previous (-1) or next (+1) date that has photos, and the calendar behind it with it. */
  const stepDay = delta => {
    const key = photoDays[openPos + delta]
    if (!key) return
    const [year, month, day] = key.split('-').map(Number)
    setOpenDay({ year, month: month - 1, day })
    goTo(year, month - 1)
  }

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
      style={{ '--pc-ink': pageInk.ink, '--pc-hi': pageInk.halo, '--pc-veil': pageInk.veil }}
    >
      <div className="pc-panel" ref={panelRef}>
        <LiquidGlassPanel params={glassEdge} />
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
          srcs={byDate.get(openKey) ?? []}
          hasPrev={openPos > 0}
          hasNext={openPos >= 0 && openPos < photoDays.length - 1}
          onStep={stepDay}
          fullBySrc={fullBySrc}
          onClose={() => setOpenDay(null)}
        />
      )}
    </section>
  )
}
