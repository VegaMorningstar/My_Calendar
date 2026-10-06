/**
 * The Info item of the settings menu. Tapping it opens a short, plain explanation of how the app treats the user's photos
 * (where they are kept, what is copied, what is never sent anywhere) right under the item; tapping it again closes it.
 *
 * Pressing and holding it for a second opens the diagnostics card instead (see DebugPanel); the menu owns that card, so it
 * survives the menu closing.
 */
import { useId, useRef, useState } from 'react'

/** How long (ms) the item is held to open the diagnostics card. */
const HOLD_MS = 900

/**
 * The privacy note. Each point is a short lead and one plain sentence or two. Every claim is true of the code:
 * photos go into IndexedDB (photo-store.js) and no code path sends them anywhere; the only network use is the app's own files.
 */
const POINTS = [
  ['Stays on your device', 'Your photos and wallpaper are saved inside this app, on this phone or computer. There is no account, and nothing is uploaded, shared or tracked.'],
  ['Copies only', 'Importing or taking a photo here saves a copy in the app. Your Photos library is never changed, and pictures taken with this camera are not added to it. The copy keeps the photo as it was, including any location details, and stays on this device. The photo’s date is read to put it on the right day.'],
  ['Private to you', 'Other websites cannot open the app’s storage. Your calendar is only saved to your device when you press Save.'],
  ['You are in control', 'Remove photos in this menu deletes the app’s copies. Clearing this site’s data in your browser does too.'],
  ['Internet', 'Only used to load and update the app itself, never for your photos.'],
]

/**
 * @param {Function} onDebug  called when the item is held long enough to open the diagnostics
 */
export default function InfoItem({ onDebug }) {
  const [open, setOpen] = useState(false)
  const textId = useId()
  const holdTimer = useRef(0)
  const held = useRef(false)
  const startHold = () => { held.current = false; clearTimeout(holdTimer.current); holdTimer.current = setTimeout(() => { held.current = true; onDebug() }, HOLD_MS) }
  const endHold = () => clearTimeout(holdTimer.current)
  // A hold opens the diagnostics; the click that follows it must not also toggle the note
  const onClick = () => { if (held.current) { held.current = false; return } setOpen(o => !o) }

  return (
    <>
      <button
        type="button" role="menuitem" className="lib-item" onClick={onClick}
        aria-expanded={open} aria-controls={textId}
        onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold}
      >
        Info
      </button>
      {open && (
        <div className="lib-info-text" id={textId}>
          {POINTS.map(([lead, body]) => <p key={lead}><strong>{lead}.</strong> {body}</p>)}
        </div>
      )}
    </>
  )
}
