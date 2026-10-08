/**
 * The + button, beside the camera button under the calendar: a second way to add photos, so it is not only in the settings menu.
 * A press opens the same photo picker as the menu's "Import photos" and the photos go through the same import (usePhotoLibrary's
 * addFiles), which reports what it did in the same toast.
 *
 * It is a Write-With-Nature glass tile with springs, the same piece as the camera button, with a drawn plus over it.
 */
import { useRef } from 'react'
import { BUTTON_MATERIAL, GlassButtons, usePageInk } from './photo-calendar/index.js'
import './photo-library/library-ui.css'

const MATERIAL = { ...BUTTON_MATERIAL, size: 44, radius: 22, edge: 10 }

/**
 * @param {(files: File[]) => void} onFiles  gets the chosen photos; pass the library's addFiles
 * @param {boolean} [busy]  an import is running: the button waits
 */
export default function AddPhotosButton({ onFiles, busy = false }) {
  const slotRef = useRef(null)
  const ink = usePageInk(slotRef)
  const input = useRef(null)

  const onPicked = e => {
    const files = [...e.target.files]
    e.target.value = '' // lets the same photos be chosen again later
    if (files.length) onFiles(files)
  }

  return (
    <div className="lib-plus">
      {/* The picker opens synchronously inside the press, which iOS requires */}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={onPicked} aria-hidden="true" tabIndex={-1} />
      <div className="lib-plus-slot" ref={slotRef} style={{ '--lib-ink': ink.ink }}>
        <GlassButtons
          material={MATERIAL}
          items={[{ key: 'add-photos', label: '', title: 'Add photos', width: MATERIAL.size, onClick: () => { if (!busy) input.current?.click() }, fallbackClass: 'lib-gear' }]}
        />
        {/* A plus, drawn over the tile, centred; taps pass through to the tile underneath */}
        <svg className="lib-gear-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
    </div>
  )
}
