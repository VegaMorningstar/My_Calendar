/**
 * "2 photos this month": a small italic line under the calendar panel, at its left. Its colour follows what is behind it
 * (the wallpaper just below the panel), like every other piece of text.
 */
import { useRef } from 'react'
import usePageInk, { inkVars } from '../hooks/usePageInk.js'

/**
 * @param {number}  count   photos in the month or year on screen
 * @param {boolean} isYear  the year view: the line says "this year" instead of "this month"
 */
export default function PhotoCount({ count, isYear }) {
  const ref = useRef(null)
  const ink = usePageInk(ref)
  return (
    <p className="pc-count" ref={ref} style={inkVars(ink)}>
      {`${count} ${count === 1 ? 'photo' : 'photos'} this ${isYear ? 'year' : 'month'}`}
    </p>
  )
}
