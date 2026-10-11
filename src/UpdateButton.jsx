/**
 * This app's look for the update prompt (src/pwa-update): a glass pill, WWN's toolbar button material, 36px tall, italic like
 * the info button. Handed to `UpdatePrompt` as its `renderButton`, so the update feature itself stays free of this app's glass.
 */
import { BUTTON_MATERIAL, GlassButtons } from './photo-calendar/index.js'

const MATERIAL = { ...BUTTON_MATERIAL, size: 36, radius: 18, edge: 8, letterSize: 13, letterWeight: 'italic 400' }
const WIDTH = 250

/** @param {{label: string, title: string, onClick: () => void}} props  what `UpdatePrompt` passes to `renderButton` */
export default function UpdateButton({ label, title, onClick }) {
  return (
    <GlassButtons
      material={MATERIAL}
      items={[{ key: 'update', width: WIDTH, fallbackClass: 'lib-info-btn', label, title, onClick }]}
    />
  )
}
