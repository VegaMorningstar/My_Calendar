/**
 * The info button for the bottom left of the page, and the hint shown while the
 * calendar is empty.
 *
 * Pressing and holding the info button for a second opens a small diagnostics card (see DebugPanel). The
 * info button is a Write-With-Nature glass tile labelled "info" in italics, like the gear. Tapping it
 * slides a note open beside it; tapping it again slides it shut. The text has no
 * panel behind it: its colour follows how dark the wallpaper is directly behind it.
 */
import { useId, useRef, useState } from 'react'
import DebugPanel from '../DebugPanel.jsx'
import { BUTTON_MATERIAL, GlassButtons, usePageInk } from '../photo-calendar/index.js'
import './library-ui.css'

/**
 * The info tile: WWN's toolbar button material, 36px tall and wide enough for the word.
 * `letterWeight` goes straight into the canvas font string ("<weight> <size>px Playfair
 * Display"), so a leading "italic" gives the word in italics with no change to WWN's code.
 * The italic face the page loads is weight 400.
 */
const INFO_WIDTH = 54
const INFO_MATERIAL = { ...BUTTON_MATERIAL, size: 36, radius: 18, edge: 8, letterSize: 13, letterWeight: 'italic 400' }

/** How long (ms) the info button is held to open the diagnostics card. */
const HOLD_MS = 900

const NOTE = 'Photos stay on this device and never leave your device. Removing them here does not affect your Photos library.'

/**
 * The info button and its note, to sit at the bottom left.
 */
export default function LibraryNote() {
  const ref = useRef(null)
  const ink = usePageInk(ref)
  const [open, setOpen] = useState(false)
  const [debug, setDebug] = useState(false)
  const noteId = useId()
  const holdTimer = useRef(0)
  const held = useRef(false)
  const startHold = () => { held.current = false; clearTimeout(holdTimer.current); holdTimer.current = setTimeout(() => { held.current = true; setDebug(true) }, HOLD_MS) }
  const endHold = () => clearTimeout(holdTimer.current)

  return (
    <div className="lib-info" ref={ref} style={{ '--lib-ink': ink.ink, '--lib-hi': ink.halo }}>
      <div className="lib-info-slot">
        <GlassButtons
          material={INFO_MATERIAL}
          items={[{
            key: 'info', label: 'info', title: open ? 'Hide info' : 'About your photos', width: INFO_WIDTH,
            // A hold opens the diagnostics; the click that follows it must not also toggle the note
            onClick: () => { if (held.current) { held.current = false; return } setOpen(o => !o) }, fallbackClass: 'lib-info-btn',
            // GlassButtons spreads this object onto the button, so it can carry the press handlers too
            aria: { 'aria-expanded': open, 'aria-controls': noteId, onPointerDown: startHold, onPointerUp: endHold, onPointerLeave: endHold, onPointerCancel: endHold },
          }]}
        />
      </div>

      {/* Slides open sideways and shut again by animating the width from 0 */}
      <div className={`lib-note-wrap${open ? ' lib-note-open' : ''}`}>
        <p className="lib-note" id={noteId} aria-hidden={!open}>{NOTE}</p>
      </div>
      {debug && <DebugPanel onClose={() => setDebug(false)} />}
    </div>
  )
}

/**
 * A short hint under the calendar while no photos have been imported yet.
 * @param {object} library  the value returned by usePhotoLibrary()
 */
export function LibraryHint({ library }) {
  const ref = useRef(null)
  const ink = usePageInk(ref)
  const empty = library.photos.length === 0 && library.progress === null
  if (!empty) return null
  return (
    <p className="lib-hint" ref={ref} style={{ '--lib-ink': ink.ink, '--lib-hi': ink.halo }}>
      No photos yet. Tap the gear at the bottom left to import some.
    </p>
  )
}
