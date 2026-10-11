/**
 * The shape (width over height) of each photo in a list, read from the pictures themselves, so a day's photos can be laid out as the
 * vertical and horizontal rectangles they are, not as squares. It works for photos stored before shapes were kept anywhere.
 *
 * Shapes are remembered for the session (by the picture's address), so reopening a day is instant; the first time a day opens, its
 * pictures are measured (a few milliseconds: they are small previews already on the device) and `ready` turns true once all are known.
 * A picture that cannot be read counts as square. Shapes are held between PANORAMA and TALL so one extreme photo cannot make a row
 * absurd; the picture is cropped to fit its box, as it was when everything was square.
 */
import { useEffect, useState } from 'react'

const cache = new Map() // src -> width / height

/** The widest and the tallest shape the layout will give a photo. */
const WIDEST = 2
const TALLEST = 0.55

const clampRatio = r => Math.min(WIDEST, Math.max(TALLEST, r))

/**
 * @param {string[]} srcs  the photos' picture addresses
 * @returns {{ ratio: (src: string) => number, ready: boolean }}
 */
export default function usePhotoRatios(srcs) {
  const [, setTick] = useState(0)
  const key = srcs.join('\n')

  useEffect(() => {
    let alive = true
    for (const src of srcs) {
      if (cache.has(src)) continue
      const img = new Image()
      const done = ratio => { cache.set(src, ratio); if (alive) setTick(t => t + 1) }
      img.onload = () => done(img.naturalWidth && img.naturalHeight ? clampRatio(img.naturalWidth / img.naturalHeight) : 1)
      img.onerror = () => done(1)
      img.src = src
    }
    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ratio: src => cache.get(src) ?? 1,
    ready: srcs.every(src => cache.has(src)),
  }
}
