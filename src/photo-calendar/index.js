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

// Helpers
export { groupByDate, parsePhotoDate, monthCells } from './lib/dates.js'

// Tell the glass what colour the page is, if it changes after load
export { setPaperColor } from './wwn-glass/index.js'
