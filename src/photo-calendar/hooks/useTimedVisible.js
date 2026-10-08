/**
 * Something that shows for a few seconds, then goes, and shows again when asked or when `changeKey` changes.
 *
 * Used for the side arrows: they are on screen when a view opens (so the person sees they are there), fade away so they do not
 * take up the picture, and come back for a moment whenever the view steps (a swipe, a key, a click) or the person reaches for
 * them. The first showing may last longer than the later ones.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * @param {*}      changeKey  when this changes, it shows again (for `changeMs`)
 * @param {number} firstMs    how long it shows when the view first opens
 * @param {number} changeMs   how long it shows after a change or a reveal
 * @returns {{visible: boolean, reveal: () => void}}
 */
export default function useTimedVisible(changeKey, firstMs = 3000, changeMs = 3000) {
  const [visible, setVisible] = useState(true)
  const timer = useRef(0)
  const first = useRef(true)

  const show = useCallback(ms => {
    clearTimeout(timer.current)
    setVisible(true)
    timer.current = setTimeout(() => setVisible(false), ms)
  }, [])

  useEffect(() => {
    show(first.current ? firstMs : changeMs)
    first.current = false
  }, [changeKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), [])

  const reveal = useCallback(() => show(changeMs), [show, changeMs])
  return { visible, reveal }
}
