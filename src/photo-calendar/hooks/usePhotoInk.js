/**
 * Text colours for the date, weekday and count pill drawn over a photo.
 *
 * Each piece of text samples its own corner of the photo (see photoLuma) so it
 * can be dark over a bright patch and light over a dark one at the same time.
 */
import { useEffect, useState } from 'react'
import { inkFor, photoLuma, PHOTO_BAND } from '../lib/adaptive-ink.js'

/**
 * @param {string} src      the photo currently shown
 * @param {*} recheckKey    changes when the page colour changes, to re-sample
 * @returns {object|null}   inline CSS variables for the cell, or null until measured
 */
export default function usePhotoInk(src, recheckKey) {
  const [vars, setVars] = useState(null)

  useEffect(() => {
    if (!src) return
    let live = true
    photoLuma(src).then(l => {
      if (!live || !l) return
      const num = inkFor(l.num, PHOTO_BAND)
      const dow = inkFor(l.dow, PHOTO_BAND)
      const badge = inkFor(l.badge, PHOTO_BAND)
      setVars({
        '--num-ink': num.ink, '--num-halo': num.halo,
        '--dow-ink': dow.ink, '--dow-halo': dow.halo,
        '--badge-ink': badge.ink, '--badge-halo': badge.halo,
      })
    })
    return () => { live = false }
  }, [src, recheckKey])

  return vars
}
