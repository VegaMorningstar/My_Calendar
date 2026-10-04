/**
 * Facts about the screen and page, for working out layout problems that only show on a real phone
 * (for example the page being reported shorter than the screen). Shown by DebugPanel.
 */

/** The top and bottom safe-area insets in px, read by measuring a probe element. */
function safeAreaInsets() {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
  document.body.appendChild(probe)
  const s = getComputedStyle(probe)
  const out = { top: s.paddingTop, right: s.paddingRight, bottom: s.paddingBottom, left: s.paddingLeft }
  probe.remove()
  return out
}

/** Whether the page runs as an installed Home Screen app. */
export const isStandalone = () => !!(navigator.standalone || window.matchMedia('(display-mode: standalone)').matches)

/**
 * How much shorter the page's viewport is than the screen, in px. On iPhone, an installed app
 * can be given a viewport shorter than the screen (a regression since iOS 26.1), and anything
 * painted by the page stops short, leaving a plain bar. 0 in a normal case, and in a browser tab,
 * where toolbars legitimately take space.
 */
export function viewportDeficit() {
  if (!isStandalone()) return 0
  const portrait = window.innerHeight >= window.innerWidth
  const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
  return Math.max(0, Math.round(screenH - window.innerHeight))
}

/** A snapshot of everything relevant, as label/value pairs. */
export function collectMetrics() {
  const vv = window.visualViewport
  return {
    'inner (w x h)': `${innerWidth} x ${innerHeight}`,
    'screen (w x h)': `${screen.width} x ${screen.height}`,
    'visualViewport (w x h)': vv ? `${Math.round(vv.width)} x ${Math.round(vv.height)}` : 'n/a',
    'visualViewport offsetTop / pageTop': vv ? `${Math.round(vv.offsetTop)} / ${Math.round(vv.pageTop)}` : 'n/a',
    'viewport deficit (screen - inner)': `${viewportDeficit()} px`,
    'safe area (top right bottom left)': (({ top, right, bottom, left }) => `${top} ${right} ${bottom} ${left}`)(safeAreaInsets()),
    'standalone': String(isStandalone()),
    'display-mode: standalone': String(window.matchMedia('(display-mode: standalone)').matches),
    'pixel ratio': String(devicePixelRatio),
    'html / body / #root height': [document.documentElement, document.body, document.getElementById('root')].map(e => Math.round(e.getBoundingClientRect().height)).join(' / '),
    'scroll (x, y)': `${scrollX}, ${scrollY}`,
    'userAgent': navigator.userAgent.replace(/^Mozilla\/5.0 /, ''),
  }
}
