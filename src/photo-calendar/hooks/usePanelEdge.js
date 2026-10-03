/**
 * Sizes the rim of a glass panel in pixels, so it never grows into the content.
 *
 * Write-With-Nature's shader measures the rim as a fraction of the panel's height,
 * so on a tall panel it becomes thick and its strong refraction smears across the
 * edge (and over anything near it, such as the date boxes). Here the rim is a
 * fixed number of pixels, kept inside the panel's own padding, and the refraction
 * is scaled to match, so a thin rim bends light as much per pixel as WWN's does.
 *
 * It also fixes the corners. The shader rounds its corners by the element's
 * border-radius PLUS the rim width, so a panel with a 34px radius gets a visibly
 * rounder glass than its own CSS outline. The rim width is published as the CSS
 * variable --pc-edge, and the panel's border-radius subtracts it (see base.css),
 * so the glass corner comes out at exactly the intended radius.
 */
import { useEffect, useState } from 'react'
import { PANEL_GLASS, glassSupported } from '../wwn-glass/index.js'

/** The preset's rim on the compose card it was tuned for (about 250px tall), in px. */
const REFERENCE_RIM_PX = 10
/** The rim is this fraction of the panel's padding, within these limits (px). */
const RIM_OF_PADDING = 0.4
const RIM_MIN = 5
const RIM_MAX = 12

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** The shader settings for a panel `heightPx` tall whose rim should be `rimPx` thick. */
function paramsFor(heightPx, rimPx) {
  // Keep WWN's proportions between where the frost ends and where the rim ends
  const endPx = rimPx / (1 - PANEL_GLASS.start / PANEL_GLASS.end)
  const startPx = endPx - rimPx
  const k = rimPx / REFERENCE_RIM_PX // thicker rim, proportionally more bend
  return {
    ...PANEL_GLASS,
    start: startPx / heightPx,
    end: endPx / heightPx,
    refractionStrength: PANEL_GLASS.refractionStrength * k,
    chromaticStrength: PANEL_GLASS.chromaticStrength * k,
    // The rim's own blur and feather are in pixel-like units already; leave them
  }
}

/**
 * @param {{current: HTMLElement|null}} ref  the glass panel's element
 * @returns the params to give <LiquidGlassPanel>
 */
export default function usePanelEdge(ref) {
  const [params, setParams] = useState(PANEL_GLASS)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const height = el.offsetHeight
      if (!height) return
      const padding = parseFloat(getComputedStyle(el).paddingLeft) || 0
      const rim = clamp(padding * RIM_OF_PADDING, RIM_MIN, RIM_MAX)
      const next = paramsFor(height, rim)
      // Without WebGPU there is no shader rim, so the corners need no compensation
      el.style.setProperty('--pc-edge', glassSupported ? `${(next.end * height).toFixed(2)}px` : '0px')
      setParams(prev => (Math.abs(prev.end - next.end) < 1e-4 && Math.abs(prev.start - next.start) < 1e-4 ? prev : next))
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(el)
    return () => observer?.disconnect()
  }, [ref])

  return params
}
