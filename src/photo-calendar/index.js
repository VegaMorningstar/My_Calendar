/**
 * Public API of the photo calendar. Import from this file only:
 *
 *   import { PhotoCalendar } from './photo-calendar'
 */
export { default as PhotoCalendar } from './PhotoCalendar.jsx'
export { default } from './PhotoCalendar.jsx'

// Pieces, for building a different layout around the same parts
export { default as MonthView } from './components/MonthView.jsx'
export { default as YearView } from './components/YearView.jsx'
export { default as DayDetail } from './components/DayDetail.jsx'
export { default as CalendarHeader } from './components/CalendarHeader.jsx'
export { default as useCalendarView } from './hooks/useCalendarView.js'
export { default as usePageInk } from './hooks/usePageInk.js'
export { default as usePanelEdge } from './hooks/usePanelEdge.js'

// Helpers
export { groupByDate, parsePhotoDate, monthCells } from './lib/dates.js'

// The glass kit: WWN's glass pieces, for building other UI that matches the calendar
// (the settings gear and menu use these)
export { GlassButtons, LiquidGlassPanel, PANEL_GLASS, usePanelGlass, BUTTON_MATERIAL } from './wwn-glass/index.js'

// The colours along the top and bottom edges of the screen (the status bar tint and the page behind), and
// how far the wallpaper extends past the bottom of the viewport
export { bottomEdgeColor, topEdgeColor } from './lib/adaptive-ink.js'
export { WALLPAPER_OVERSCAN_PX } from './wwn-glass/index.js'

// Tell the glass what the page behind it looks like, if that changes after load
export { setPaperColor, setBackgroundImage, setBackgroundAverage } from './wwn-glass/index.js'
