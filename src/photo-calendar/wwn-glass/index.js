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
export { default as usePanelGlass, glassSupported } from './hooks/usePanelGlass.js'
export { default as GlassButtons } from './glass-buttons/GlassButtons.jsx'
export { BUTTON_MATERIAL } from './glass-buttons/constants.ts'
export { liquidGlass } from './liquid-glass.js'

// The tile glass behind WWN's glass alphabet, for the calendar's date tiles: the springs, the shader
// setup and its backdrop painter. The shader is WebGPU code, so it is loaded only when asked for.
export { Spring } from './glass-alphabet/spring.ts'
export { squashProperties, liftProperties, POINTER_DEFAULTS } from './glass-alphabet/constants.ts'
export const loadTileGlass = async () => {
  const [{ setupTileGlass }, { createTileBackdrop }] = await Promise.all([
    import('./glass-alphabet/scene.ts'),
    import('./glass-alphabet/backdrop.js'),
  ])
  return { setupTileGlass, createTileBackdrop }
}

// WWN's glyph material, which carries the adaptive-ink band the calendar reuses
export { MATERIAL_DEFAULTS } from './glass-alphabet/constants.ts'

// The "paper" contract: the page colour (or photo) the glass refracts. In WWN these
// come from its theme; here they come from the small stand-ins in theme.js and stars.js.
export { paperColor, setPaperColor, setBackgroundImage, setBackgroundAverage, isWallpaperActive, getBackgroundImage, syncPaperFromBody, onPaperChange, WALLPAPER_OVERSCAN_PX } from './theme.js'
