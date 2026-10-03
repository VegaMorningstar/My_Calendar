/**
 * The calendar's single doorway into the Write-With-Nature (WWN) glass code.
 *
 * Nothing outside this folder imports from a deeper path, so the whole of WWN's
 * glass can be swapped for another implementation by replacing this file (see
 * README.md in this folder for the contract and how to run inside WWN itself).
 */

// Glass surfaces and buttons (verbatim WWN code, WebGPU with a CSS fallback)
export { default as LiquidGlassPanel } from './liquid-glass/LiquidGlassPanel.jsx'
export { default as PANEL_GLASS } from './liquid-glass/panelPreset.js'
export { default as usePanelGlass } from './hooks/usePanelGlass.js'
export { default as GlassButtons } from './glass-buttons/GlassButtons.jsx'
export { BUTTON_MATERIAL } from './glass-buttons/constants.ts'
export { liquidGlass } from './liquid-glass.js'

// WWN's glyph material, which carries the adaptive-ink band the calendar reuses
export { MATERIAL_DEFAULTS } from './glass-alphabet/constants.ts'

// The "paper" contract: the page colour the glass refracts. In WWN these come
// from its theme; here they come from the small stand-in in theme.js.
export { paperColor, setPaperColor, syncPaperFromBody, onPaperChange } from './theme.js'
