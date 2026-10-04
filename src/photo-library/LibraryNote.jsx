/**
 * The line under the calendar: a hint while it is empty, and a small info button
 * that shows or hides a note on where the photos live.
 *
 * The info button is a Write-With-Nature glass tile, like the gear. Tapping it
 * slides the note open; tapping it again slides it shut. The text has no panel
 * behind it: its colour follows how dark the wallpaper is directly behind it.
 *
 * @param {object} library  the value returned by usePhotoLibrary()
 */
import { useId, useRef, useState } from 'react'
import { BUTTON_MATERIAL, GlassButtons, usePageInk } from '../photo-calendar/index.js'
import './library-ui.css'

/** The info tile: WWN's toolbar button material at 36px. */
const INFO_MATERIAL = { ...BUTTON_MATERIAL, size: 36, radius: 18, edge: 8, letterSize: 20 }

const NOTE = 'Photos stay on this device and never leave your device. Removing them here does not affect your Photos library.'

export default function LibraryNote({ library }) {
  const ref = useRef(null)
  const ink = usePageInk(ref)
  const [open, setOpen] = useState(false)
  const noteId = useId()
  const empty = library.photos.length === 0 && library.progress === null

  return (
    <div className="lib-footer" ref={ref} style={{ '--lib-ink': ink.ink, '--lib-hi': ink.halo }}>
      {empty && <p className="lib-hint">No photos yet. Tap the gear at the top left to import some.</p>}

      <GlassButtons
        material={INFO_MATERIAL}
        items={[{
          key: 'info', label: 'i', title: open ? 'Hide info' : 'About your photos', width: INFO_MATERIAL.size,
          onClick: () => setOpen(o => !o), fallbackClass: 'lib-info-btn',
          aria: { 'aria-expanded': open, 'aria-controls': noteId },
        }]}
      />

      {/* Slides open and shut by animating the row height between 0 and its content */}
      <div className={`lib-note-wrap${open ? ' lib-note-open' : ''}`}>
        <p className="lib-note" id={noteId} aria-hidden={!open}>{NOTE}</p>
      </div>
    </div>
  )
}
