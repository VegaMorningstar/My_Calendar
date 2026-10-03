/**
 * Calendar maths and filename-to-date parsing.
 *
 * Every date here is a local calendar date. Nothing goes through UTC, so a
 * photo never slides to the neighbouring day because of a timezone offset.
 */

/** Zero-pads to two digits. */
export const pad = n => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' key for a date. `m` is zero-based, like Date. */
export const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const FULL_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Weekday labels rotated so the week starts on `weekStartsOn` (0 = Sunday). */
export const weekdayLabels = (weekStartsOn = 0, names = WEEKDAYS) =>
  [...names.slice(weekStartsOn), ...names.slice(0, weekStartsOn)]

/**
 * Cells for one month page: leading nulls to line day 1 up under its weekday,
 * then 1..N. Month lengths and leap years come from Date.
 */
export function monthCells(year, month, weekStartsOn = 0) {
  const lead = (new Date(year, month, 1).getDay() - weekStartsOn + 7) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
}

/** 1-based position of a date within its year. */
export const dayOfYear = (y, m, d) =>
  Math.round((new Date(y, m, d) - new Date(y, 0, 1)) / 86400000) + 1

/** 365 or 366. */
export const daysInYear = y => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365)

/** '1 photo' / '3 photos'. */
export const photoCountLabel = n => `${n} ${n === 1 ? 'photo' : 'photos'}`

/** Last YYYY-MM-DD (or YYYYMMDD) in a file name, validated as a real date. */
export function parsePhotoDate(src) {
  const name = decodeURIComponent(src.split('/').pop().replace(/\.[^.]+$/, ''))
  const re = /(\d{4})-?(\d{2})-?(\d{2})(?!\d)/g
  let hit = null
  for (let m; (m = re.exec(name)); ) hit = m
  if (!hit) return null
  const [y, mo, d] = [+hit[1], +hit[2] - 1, +hit[3]]
  const dt = new Date(y, mo, d)
  return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d ? dateKey(y, mo, d) : null
}

/** Accepts URLs or { src, date } and returns Map<'YYYY-MM-DD', src[]>. */
export function groupByDate(photos) {
  const map = new Map()
  for (const p of photos) {
    const src = typeof p === 'string' ? p : p.src
    const key = typeof p === 'string' ? parsePhotoDate(src) : p.date ?? parsePhotoDate(src)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(src)
  }
  return map
}

/** Number of photos on the days of one month. */
export function countInMonth(byDate, year, month) {
  return monthCells(year, month).reduce(
    (n, d) => n + (d ? byDate.get(dateKey(year, month, d))?.length ?? 0 : 0), 0)
}
