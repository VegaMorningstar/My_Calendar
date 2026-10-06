/**
 * The "Get your calendar" button, bottom right with the other buttons: opens the page where the month on screen is laid out
 * as a calendar sheet, photos chosen, ready to save (see photo-calendar/export/ExportPage.jsx).
 *
 * It is a Write-With-Nature glass tile like its neighbours, with a lilac glow: the light is asked for with `glow` on
 * the item and its colour is the theme's `buttonGlow`. Its text is set exactly like the info and flat/glass buttons. The glow is held steady (`glowBreath: false`) so the idle page still
 * draws nothing.
 */
import { BUTTON_MATERIAL, GlassButtons } from './photo-calendar/index.js'
import './photo-library/library-ui.css'

const WIDTH = 136
const MATERIAL = {
  ...BUTTON_MATERIAL, size: 36, radius: 18, edge: 8, letterSize: 13, letterWeight: 'italic 400',
  glowBreath: false, litTint: 0.5,
  // No bloom around the letters: it made the words look heavier and outlined, unlike "info" and "flat". The lilac is the colour of
  // the glass body only, and the text is drawn exactly like theirs (same font, size, weight and ink).
  glowStrength: 0,
}

/** @param {Function} onOpen  called when the button is pressed */
export default function GetCalendarButton({ onOpen }) {
  return (
    <div className="lib-get">
      <div className="lib-get-slot">
        <GlassButtons
          material={MATERIAL}
          items={[{
            key: 'get-calendar', label: 'Get your calendar', width: WIDTH, glow: 1,
            title: 'Lay this month out as a calendar page and save it',
            onClick: onOpen, fallbackClass: 'lib-info-btn lib-get-btn',
          }]}
        />
      </div>
    </div>
  )
}
