/**
 * The button at the bottom right that switches the date boxes between the liquid glass tiles and
 * the plain boxes. It is a Write-With-Nature glass tile like the gear and the info button, and
 * its word names the style being shown now. The choice is remembered on the device.
 */
import { useRef } from 'react'
import { BUTTON_MATERIAL, GlassButtons, usePageInk } from './photo-calendar/index.js'
import './photo-library/library-ui.css'

const STORAGE_KEY = 'mycal.tileStyle'
const TOGGLE_WIDTH = 64
const TOGGLE_MATERIAL = { ...BUTTON_MATERIAL, size: 36, radius: 18, edge: 8, letterSize: 13, letterWeight: 'italic 400' }

/**
 * The tile style to start with: `?lq=0` or `?lq=1` in the address wins (so the two looks can be
 * compared), then the saved choice, then glass. Returns true for glass.
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
            key: 'tile-style', label: glass ? 'glass' : 'flat', width: TOGGLE_WIDTH,
            title: glass ? 'Switch to plain date boxes' : 'Switch to glass date tiles',
            onClick: toggle, fallbackClass: 'lib-info-btn',
            aria: { 'aria-pressed': glass },
          }]}
        />
      </div>
    </div>
  )
}
