/**
 * The button at the bottom right that switches the date boxes between the liquid glass tiles and the plain, "matte" boxes
 * (the original, non-reflective look).
 *
 * It is always a Write-With-Nature glass tile, like the gear and the info button, whichever style is showing. Its word names
 * the style a press switches to: while the glass tiles show it reads "matte", and while the matte boxes show it reads "glass".
 * The choice is remembered on the device.
 */
import { useRef } from 'react'
import { BUTTON_MATERIAL, GlassButtons, usePageInk } from './photo-calendar/index.js'
import './photo-library/library-ui.css'

const STORAGE_KEY = 'mycal.tileStyle'
const TOGGLE_WIDTH = 56
const TOGGLE_MATERIAL = { ...BUTTON_MATERIAL, size: 36, radius: 18, edge: 8, letterSize: 13, letterWeight: 'italic 400' }

/** What the plain style is called on the button. */
export const MATTE_WORD = 'matte'

/**
 * The tile style to start with: `?lq=0` or `?lq=1` in the address wins (so the two looks can be
 * compared), then the saved choice, then glass. Returns true for glass.
 * (The saved word is still 'flat', as it was before the style had a better name, so choices already saved keep working.)
 */
export function initialGlassTiles() {
  try {
    const q = new URLSearchParams(window.location.search).get('lq')
    if (q === '0') return false
    if (q === '1') return true
    return localStorage.getItem(STORAGE_KEY) !== 'flat'
  } catch { return true }
}

/**
 * @param {boolean}  glass     true while the glass tiles are showing
 * @param {Function} onChange  called with the new value when the button is pressed
 */
export default function TileStyleToggle({ glass, onChange }) {
  const ref = useRef(null)
  const ink = usePageInk(ref)
  const toggle = () => {
    const next = !glass
    try { localStorage.setItem(STORAGE_KEY, next ? 'glass' : 'flat') } catch { /* not saved, still switches */ }
    onChange(next)
  }
  return (
    <div className="lib-style" ref={ref} style={{ '--lib-ink': ink.ink, '--lib-hi': ink.halo }}>
      <div className="lib-style-slot">
        <GlassButtons
          material={TOGGLE_MATERIAL}
          items={[{
            key: 'tile-style', label: glass ? MATTE_WORD : 'glass', width: TOGGLE_WIDTH,
            title: glass ? 'Switch to matte date boxes' : 'Switch to glass date tiles',
            onClick: toggle, fallbackClass: 'lib-info-btn',
            aria: { 'aria-pressed': glass },
          }]}
        />
      </div>
    </div>
  )
}
