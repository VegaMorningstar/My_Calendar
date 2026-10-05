/**
 * "New version available, tap to reload": a glass pill that appears above the bottom buttons when a new version of the
 * app has been downloaded and is waiting (see register.js). One tap reloads into the new version; the photos,
 * wallpaper and settings live on the phone and are not touched.
 */
import { useEffect, useState } from 'react'
import { BUTTON_MATERIAL, GlassButtons } from '../photo-calendar/index.js'
import { applyUpdate, onUpdateReady } from './register.js'

/** The pill: WWN's toolbar button material, 36px tall, italic like the info button. */
const MATERIAL = { ...BUTTON_MATERIAL, size: 36, radius: 18, edge: 8, letterSize: 13, letterWeight: 'italic 400' }
const WIDTH = 250

export default function UpdatePrompt() {
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => onUpdateReady(() => setReady(true)), [])
  if (!ready) return null
  return (
    <div className="update-prompt" role="status" aria-live="polite">
      <GlassButtons
        material={MATERIAL}
        items={[{
          key: 'update', width: WIDTH, fallbackClass: 'lib-info-btn',
          label: busy ? 'Updating...' : 'New version available, tap to reload',
          title: 'Reload to get the new version',
          onClick: () => { setBusy(true); applyUpdate() },
        }]}
      />
    </div>
  )
}
