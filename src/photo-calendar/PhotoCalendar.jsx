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
 *   rotateMs      the least time each photo stays up on a multi-photo day (default 5 seconds; random extra on top)
 *   liquidTiles   draw the date boxes as WWN liquid glass tiles (default true; CSS boxes without WebGPU)
 *   onViewChange  called with { year, month, mode } (month is zero-based, mode 'month' or 'year') whenever the view changes, so
 *                 the page around the calendar knows which month is on screen (the "Get your calendar" button uses it)
 *   paused        true switches the keyboard shortcuts off, while the page around the calendar has a screen of its own open
 *   className     extra class on the root element
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LiquidGlassPanel, usePanelGlass } from './wwn-glass/index.js'
import CalendarHeader from './components/CalendarHeader.jsx'
import DayDetail from './components/DayDetail.jsx'
import SideArrows from './components/SideArrows.jsx'
import MonthView from './components/MonthView.jsx'
import PhotoCount from './components/PhotoCount.jsx'
import YearView from './components/YearView.jsx'
import useCalendarView from './hooks/useCalendarView.js'
import { useCalendarScript } from './lib/calendarScript.js'
import usePageInk from './hooks/usePageInk.js'
import usePanelEdge from './hooks/usePanelEdge.js'
import usePinchZoom from './hooks/usePinchZoom.js'
import useSwipeNav from './hooks/useSwipeNav.js'
import useTimedVisible from './hooks/useTimedVisible.js'
import useTrackpadSwipe from './hooks/useTrackpadSwipe.js'
import { MONTHS, countInMonth, dateKey, fullSources, groupByDate, monthCells } from './lib/dates.js'
import { PANEL_FALLBACK } from './lib/glass-config.js'
import './styles/base.css'
import './styles/compact.css'

/** How long (ms) the side arrows show when the app opens, and after the view changes. */
const ARROWS_FIRST_MS = 5000
const ARROWS_CHANGE_MS = 3000

export default function PhotoCalendar({
  photos = [],
  initialDate,
  weekStartsOn = 0,
  rotateMs = 5000,
  liquidTiles = true,
  onViewChange,
  paused = false,
  underRight = null,
  onDeletePhotos,
  originalsOf,
  renderDayAdd,
  onTodayOpen,
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
  const { view, anim, isYear, go, zoom, toggleZoom, goTo } = useCalendarView({ initialDate, enabled: !openDay && !paused })

  // A script from the page around the calendar (the guided tour, see lib/calendarScript.js) can put the calendar in a state: the
  // year view, or today's sheet open. When the script is cleared the calendar goes back to the month with nothing open.
  const script = useCalendarScript()
  const hadScript = useRef(false)
  const now0 = useRef(view)
  now0.current = view
  useEffect(() => {
    const t = new Date()
    const here = now0.current
    if (script) {
      hadScript.current = true
      if (script.view && script.view !== here.mode) zoom(script.view)
      if (script.day) {
        const d = script.day === 'yesterday' ? new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1) : t
        if (here.y !== d.getFullYear() || here.m !== d.getMonth()) goTo(d.getFullYear(), d.getMonth())
        setOpenDay({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() })
      } else setOpenDay(null)
    } else if (hadScript.current) {
      hadScript.current = false
      setOpenDay(null)
      if (here.mode !== 'month') zoom('month')
      if (here.y !== t.getFullYear() || here.m !== t.getMonth()) goTo(t.getFullYear(), t.getMonth())
    }
  }, [script]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tell the page around the calendar which month (or year) is showing
  useEffect(() => { onViewChange?.({ year: view.y, month: view.m, mode: view.mode }) }, [view.y, view.m, view.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Every date that has photos, oldest first: the stops for the day view's previous / next. */
  const photoDays = useMemo(() => [...byDate.keys()].sort(), [byDate])
  const openKey = openDay && dateKey(openDay.year, openDay.month, openDay.day)
  // The nearest days with photos either side of the open day (an open day may itself have none, when it is open to add one)
  const prevKey = openKey ? photoDays.filter(k => k < openKey).pop() : undefined
  const nextKey = openKey ? photoDays.find(k => k > openKey) : undefined

  /** Moves the day view to the previous (-1) or next (+1) date that has photos, and the calendar behind it with it. */
  const stepDay = delta => {
    const key = delta < 0 ? prevKey : nextKey
    if (!key) return
    const [year, month, day] = key.split('-').map(Number)
    setOpenDay({ year, month: month - 1, day })
    goTo(year, month - 1)
  }

  // Swiping the panel steps the month (or the year, in year view); left is next, right is previous.
  // A finger swipe on a phone, a two-finger trackpad swipe on a laptop.
  const swipe = useSwipeNav(go)
  useTrackpadSwipe(panelRef, go) // the same on a laptop: a two-finger sideways swipe over the panel

  // Pinching the panel changes level, like the Photos app: year, month, day. Fingers together (or a trackpad pinch-in) goes
  // up a level (month to year), fingers apart goes down (year to month, then month to the latest day with photos).
  // A pinch in on the day sheet itself goes back up to the month (see DayDetail).
  usePinchZoom(panelRef, direction => {
    if (direction < 0 && !isYear) zoom('year')
    else if (direction > 0 && isYear) zoom('month')
    else if (direction > 0 && !openDay) {
      // Fingers apart on a month goes one level further in: the latest day of the month that has photos (nothing if none)
      const prefix = `${view.y}-${String(view.m + 1).padStart(2, '0')}-`
      const latest = photoDays.filter(k => k.startsWith(prefix)).pop()
      if (latest) setOpenDay({ year: view.y, month: view.m, day: Number(latest.slice(-2)) })
    }
  })

  // Hands the panel's surface to the WebGPU glass, or to WWN's CSS glass without it
  usePanelGlass(panelRef, PANEL_FALLBACK)

  const now = new Date()
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate())
  const photoCount = isYear
    ? MONTHS.reduce((n, _, m) => n + countInMonth(byDate, view.y, m), 0)
    : countInMonth(byDate, view.y, view.m)

  const noun = isYear ? 'year' : 'month'
  // The side arrows show for 5 seconds when the app opens, then fade away; any move to another month or year (a swipe, a key, an
  // arrow, the year button) brings them back for 3 seconds
  const arrows = useTimedVisible(`${view.y}-${view.m}-${view.mode}`, ARROWS_FIRST_MS, ARROWS_CHANGE_MS)
  return (
    <>
    <section
      className={`pc-root ${className}`}
      aria-label="Photo calendar"
      style={{
        '--pc-ink': pageInk.ink, '--pc-hi': pageInk.halo, '--pc-veil': pageInk.veil,
        // Boxes are sized to the rows this month has; the year view is not limited by a box size at all
        '--pc-rows': isYear ? 6 : Math.ceil(monthCells(view.y, view.m, weekStartsOn).length / 7),
        ...(isYear ? { '--pc-tile-max': '9999px' } : null),
      }}
    >
      <div className={`pc-panel${isYear ? ' pc-bare' : ''}`} ref={panelRef} {...swipe}>
        {/* The year view has no glass surface: its contents sit straight on the wallpaper */}
        {!isYear && <LiquidGlassPanel params={glassEdge} />}
        <CalendarHeader view={view} isYear={isYear} onToggleZoom={toggleZoom} />

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
            liquidTiles={liquidTiles}
            onOpenDay={day => { setOpenDay({ year: view.y, month: view.m, day }); if (dateKey(view.y, view.m, day) === todayKey) onTodayOpen?.() }}
          />
        )}
      </div>

      {/* Under the panel: how many photos at the left, and whatever the host passes as `underRight` at the right on the same line */}
      <div className="pc-under">
        <PhotoCount count={photoCount} isYear={isYear} />
        {underRight && <div className="pc-under-right">{underRight}</div>}
      </div>

      {openDay && (
        <DayDetail
          date={openDay}
          srcs={byDate.get(openKey) ?? []}
          hasPrev={!!prevKey}
          hasNext={!!nextKey}
          // Photos can be added to today and to days gone by, not to days still to come
          addSlot={renderDayAdd && openKey <= todayKey ? renderDayAdd(openKey) : null}
          onStep={stepDay}
          fullBySrc={fullBySrc}
          onClose={() => setOpenDay(null)}
          onDelete={onDeletePhotos}
          originalsOf={originalsOf}
        />
      )}
    </section>
    {/* Previous and next at the sides of the screen. On <body>, because the calendar's containment would trap a fixed-position child;
        they take the calendar's ink colours from here */}
    {createPortal(
      <div className="pc-arrows-main" style={{ '--pc-ink': pageInk.ink, '--pc-hi': pageInk.halo }}>
        <SideArrows onPrev={() => go(-1)} onNext={() => go(1)} prevLabel={`Previous ${noun}`} nextLabel={`Next ${noun}`} visible={arrows.visible || !!script?.arrows} onReveal={arrows.reveal} />
      </div>,
      document.body,
    )}
    </>
  )
}
