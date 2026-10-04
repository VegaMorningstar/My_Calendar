/**
 * Glass settings shared by the calendar's components: the button material,
 * the tints, and the fallback options for browsers without WebGPU.
 */
import { BUTTON_MATERIAL } from '../wwn-glass/index.js'

/**
 * Round 40px buttons: WWN's toolbar button material, resized. The text is a little
 * smaller than WWN's default and set in Times New Roman (through the local
 * `letterFamily` setting, see wwn-glass/README.md).
 */
export const NAV_MATERIAL = {
  ...BUTTON_MATERIAL, size: 40, radius: 20, edge: 9, letterSize: 17, letterWeight: 700,
  letterFamily: "'Times New Roman', Times, serif",
}

/** The close button's material: a larger glyph, since the multiplication sign is small. */
export const CLOSE_MATERIAL = { ...NAV_MATERIAL, letterSize: 32 }

/** Width in px of the year button, which carries four digits rather than one glyph. */
export const YEAR_BUTTON_WIDTH = 76

/** Teal cast over the next button, same shape as WWN's SAVE_TINT. */
export const TEAL_TINT = { r: 0x3c / 255, g: 0xb4 / 255, b: 0xaa / 255, strength: 0.2 }

/** Burgundy cast over the close button. */
export const BURGUNDY_TINT = { r: 0x80 / 255, g: 0x1c / 255, b: 0x3a / 255, strength: 0.34 }

/** Options for WWN's CSS glass, used only where WebGPU is missing. */
export const PANEL_FALLBACK = { scale: -60, chroma: 4, blur: 6, saturate: 1.25, aberrationIntensity: 4, elasticity: 0 }
