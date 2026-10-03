/**
 * Stand-in for Write-With-Nature's theme.js, reduced to the light theme.
 *
 * The WebGPU glass cannot sample the DOM: it refracts a canvas repainted with
 * the page's background. So it has to be told the page colour. It is read from
 * <body>'s computed background on load; call setPaperColor() if the page colour
 * changes afterwards.
 */
const FALLBACK_PAPER = '#e7dcc8'

function bodyColour() {
  if (typeof document === 'undefined') return FALLBACK_PAPER
  const c = getComputedStyle(document.body).backgroundColor
  return c && c !== 'rgba(0, 0, 0, 0)' ? c : FALLBACK_PAPER
}

const state = {
  version: 0,
  tokens: {
    paperBase: bodyColour(),
    fluidBlend: 'multiply',
    paperGradients: false, // WWN's colour washes; this page is flat
    stars: false,
    buttonGlyph: null,
    buttonGlow: null,
  },
}

const listeners = new Set()

/** Tell the glass what colour the page behind it is. Repaints on the next frame. */
export function setPaperColor(css) {
  if (state.tokens.paperBase === css) return
  state.tokens.paperBase = css
  state.version++
  listeners.forEach(fn => fn(css))
}

/** Re-read <body>'s background, for when the stylesheet landed after this module. */
export const syncPaperFromBody = () => setPaperColor(bodyColour())

export function onPaperChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const paperColor = () => state.tokens.paperBase

// A changing return value is what makes backdrop.js repaint its cached paper.
export const theme = () => state.version
export const tokens = () => state.tokens
