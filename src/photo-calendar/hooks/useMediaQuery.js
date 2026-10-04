/**
 * Whether a CSS media query currently matches, kept up to date as it changes (for example when
 * a phone is turned on its side). Used where JavaScript, not just CSS, has to change: the glass
 * buttons are sized in px by their material, so they cannot follow a media query on their own.
 */
import { useEffect, useState } from 'react'

/** @param {string} query  a media query, e.g. '(orientation: landscape) and (max-height: 520px)' */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches)
  useEffect(() => {
    const list = matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}
