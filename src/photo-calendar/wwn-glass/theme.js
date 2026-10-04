/**
 * Stand-in for Write-With-Nature's theme.js, reduced to the light theme.
 *
 * The WebGPU glass cannot sample the DOM: it refracts a canvas repainted with
 * the page's background (a flat colour, or a photo, see setBackgroundImage). So it has to be told the page colour. It is read from
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

/** Tells everyone listening what colour the page now is. */
const emit = () => listeners.forEach(fn => fn(paperColor()))

/** Tell the glass what colour the page behind it is. Repaints on the next frame. */
export function setPaperColor(css) {
  if (state.tokens.paperBase === css) return
  state.tokens.paperBase = css
  state.version++
  emit()
}

/**
 * Tell the page the wallpaper's average colour before the image itself is ready (it is remembered
 * from the last visit), so the text colours and the readability veil are right from the first frame
 * instead of changing when the image arrives.
 */
export function setBackgroundAverage(average) {
  state.bgAverage = average
  state.version++
  emit()
}

/** True once there is a wallpaper, or at least its remembered average colour. */
export const isWallpaperActive = () => !!(state.bgImage || state.bgAverage)

/**
 * Tell the glass the page has a photo as its background, so it refracts the
 * photo rather than a flat colour. `average` is the photo's average colour as a
 * CSS string, used wherever one colour has to stand for the page (text ink).
 * Pass null to go back to the plain page colour.
 *
 * This works through the stars.js stand-in: with `tokens().stars` on, WWN's
 * backdrop painter calls drawStars after filling the paper, and ours draws the photo.
 */
export function setBackgroundImage(image, average) {
  state.bgImage = image || null
  state.bgAverage = image ? average : null
  state.tokens.stars = !!image
  state.version++
  emit()
}

/**
 * How far (px) the wallpaper extends past the bottom of the viewport. On iPhone, when a Home
 * Screen app first opens, the page briefly thinks the screen is shorter than it is, so a fixed
 * wallpaper that is exactly one viewport tall stops short and leaves a white bar until the
 * first scroll. Making it taller hides that. The glass and the text-colour measurements must
 * use the same taller box, or they would look at a differently scaled copy of the photo.
 */
export const WALLPAPER_OVERSCAN_PX = 120

/** Height of the wallpaper box relative to the viewport (1 plus the overscan). */
export const wallpaperBoxScale = () => (window.innerHeight + WALLPAPER_OVERSCAN_PX) / window.innerHeight

/** The background photo (an HTMLImageElement), or null. */
export const getBackgroundImage = () => state.bgImage ?? null

/** Re-read <body>'s background, for when the stylesheet landed after this module. */
export const syncPaperFromBody = () => setPaperColor(bodyColour())

export function onPaperChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** The colour that stands for the page: the photo's average if there is one, else the paper colour. */
export const paperColor = () => state.bgAverage ?? state.tokens.paperBase

// A changing return value is what makes backdrop.js repaint its cached paper.
export const theme = () => state.version
export const tokens = () => state.tokens
