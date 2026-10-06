/**
 * The settings button: a gear that opens a small menu with
 *   Import photos / Add more photos, Remove photos, Set wallpaper, Reset wallpaper.
 * Also owns the toast that reports what happened (photos added, wallpaper set).
 *
 * The gear and the menu are Write-With-Nature glass, the same pieces the calendar
 * uses, so they refract the page (or the wallpaper) and wobble the same way: the
 * gear is a GlassButtons tile with its springs, the menu is a LiquidGlassPanel.
 * Both come in through the calendar's glass kit and fall back to plain CSS without WebGPU.
 *
 * Photos and wallpaper are chosen with the system photo picker, so the user
 * decides exactly which photos to use, and everything is stored on the device.
 */
import { useEffect, useRef, useState } from 'react'
import { BUTTON_MATERIAL, GlassButtons, LiquidGlassPanel, usePageInk, usePanelEdge, usePanelGlass } from '../photo-calendar/index.js'
import Toast from './Toast.jsx'
import './library-ui.css'

/** How long a result toast stays up, in ms. */
const TOAST_MS = 3000

/** The gear tile: WWN's toolbar button material at 44px, a comfortable touch size. */
const GEAR_MATERIAL = { ...BUTTON_MATERIAL, size: 44, radius: 22, edge: 10 }

/** Options for WWN's CSS glass, used only where WebGPU is missing. */
/**
 * The gear is a drawn icon laid over the glass tile, not a text glyph: the glyph is drawn by
 * whatever font the device falls back to, and on iPhone that is larger than on a Mac and
 * was clipped by the tile. A vector shape is the same everywhere.
 */
const GEAR_PATH = 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'

const MENU_FALLBACK = { scale: -60, chroma: 4, blur: 8, saturate: 1.25, aberrationIntensity: 4, elasticity: 0 }

/**
 * @param {object} library    the value returned by usePhotoLibrary()
 * @param {object} wallpaper  the value returned by useWallpaper()
 */
export default function SettingsMenu({ library, wallpaper }) {
  const { photos, progress, lastResult, addFiles, removeAll } = library
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const gearSlotRef = useRef(null)
  const gearInk = usePageInk(gearSlotRef) // the icon's colour follows what is behind the gear
  const photoInput = useRef(null)
  const wallpaperInput = useRef(null)
  const busy = progress !== null || wallpaper.busy
  const hasPhotos = photos.length > 0
  const hasWallpaper = !wallpaper.isDefault // a wallpaper the user chose, not the default

  // ── Toast: progress while adding, then a result for TOAST_MS ───────────────
  const [toast, setToast] = useState({ text: '', open: false })
  const timer = useRef(0)
  const flash = text => {
    clearTimeout(timer.current)
    setToast({ text, open: true })
    timer.current = setTimeout(() => setToast(t => ({ ...t, open: false })), TOAST_MS)
  }
  useEffect(() => {
    if (progress) { clearTimeout(timer.current); setToast({ text: `Adding ${progress.done} of ${progress.total}...`, open: true }) }
  }, [progress])
  useEffect(() => { if (lastResult) flash(summary(lastResult)) }, [lastResult])
  useEffect(() => { if (wallpaper.notice) flash(wallpaper.notice.text) }, [wallpaper.notice])
  useEffect(() => () => clearTimeout(timer.current), [])

  // ── Closing: a press outside the menu, or Escape ───────────────────────────
  useEffect(() => {
    if (!open) return
    const onPress = e => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    const onKey = e => {
      if (e.key !== 'Escape') return
      e.stopPropagation() // the calendar behind must not also react to Escape
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPress)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPress)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  // ── Actions. The pickers open synchronously inside the tap, which iOS requires. ──
  const pickPhotos = () => { photoInput.current.click(); setOpen(false) }
  const pickWallpaper = () => { wallpaperInput.current.click(); setOpen(false) }
  const onPhotos = e => {
    const files = [...e.target.files]
    e.target.value = '' // lets the same photos be chosen again later
    if (files.length) addFiles(files)
  }
  const onWallpaper = e => {
    const file = e.target.files[0]
    e.target.value = ''
    if (file) wallpaper.setFromFile(file)
  }
  const onRemove = () => {
    setOpen(false)
    if (window.confirm(`Remove the ${photos.length} photos you added from this app? Your Photos library is not affected.`)) removeAll()
  }

  return (
    <div className="lib-settings" ref={rootRef}>
      {/* The pickers live outside the menu so closing the menu cannot remove them mid-choice */}
      <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={onPhotos} />
      <input ref={wallpaperInput} type="file" accept="image/*" hidden onChange={onWallpaper} />

      {/* The gear: a glass tile with WWN's springs. Its CSS fallback is .lib-gear. */}
      <div className="lib-gear-slot" ref={gearSlotRef} style={{ '--lib-ink': gearInk.ink }}>
        <GlassButtons
          material={GEAR_MATERIAL}
          items={[{
            key: 'settings', label: '', title: 'Settings', width: GEAR_MATERIAL.size,
            onClick: () => setOpen(o => !o), fallbackClass: 'lib-gear',
            aria: { 'aria-haspopup': 'menu', 'aria-expanded': open },
          }]}
        />
        {/* Centred over the tile; taps pass through to the tile underneath */}
        <svg className="lib-gear-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d={GEAR_PATH} />
        </svg>
      </div>

      {open && (
        <GlassMenu>
          <button type="button" role="menuitem" className="lib-item" onClick={pickPhotos} disabled={busy}>
            {hasPhotos ? 'Add more photos' : 'Import photos'}
          </button>
          {hasPhotos && (
            <button type="button" role="menuitem" className="lib-item lib-item-danger" onClick={onRemove} disabled={busy}>
              Remove photos
            </button>
          )}
          <button type="button" role="menuitem" className="lib-item" onClick={pickWallpaper} disabled={busy}>
            {hasWallpaper ? 'Change wallpaper' : 'Set wallpaper'}
          </button>
          {hasWallpaper && (
            <button type="button" role="menuitem" className="lib-item" onClick={() => { setOpen(false); wallpaper.clear() }} disabled={busy}>
              Reset wallpaper
            </button>
          )}
        </GlassMenu>
      )}

      <Toast text={toast.text} open={toast.open} />
    </div>
  )
}

/** One sentence describing what an import or removal did. */
/** '2026-10-12' as '12 October'. */
function dayName(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

function summary({ added, skipped, failed, undated, removed, dates }) {
  if (removed !== undefined) return `Removed ${removed} ${removed === 1 ? 'photo' : 'photos'} from this app`
  // One photo: say which day it went to, which is what matters when it was just taken with the camera
  const parts = [added === 1 && dates?.length === 1 ? `Added to ${dayName(dates[0])}` : `Added ${added} ${added === 1 ? 'photo' : 'photos'}`]
  if (undated) parts.push(`${undated} had no capture date, so the file date was used`)
  if (skipped) parts.push(`${skipped} already added`)
  if (failed) parts.push(`${failed} could not be read`)
  return parts.join(', ')
}

/**
 * The menu surface: a WWN liquid glass panel with the items on top. It is its
 * own component so the glass hook runs when the menu opens, and the panel's
 * WebGPU context is released when it closes. The shadow sits on an outer
 * wrapper because the glass hook clears the shadow of the element it manages.
 */
function GlassMenu({ children }) {
  const glassRef = useRef(null)
  usePanelGlass(glassRef, MENU_FALLBACK)
  const glassEdge = usePanelEdge(glassRef) // a pixel-sized rim and matching corners, as on the calendar
  // The item text follows how dark the page is behind the menu
  const ink = usePageInk(glassRef)
  // The warning colour adapts as well: burgundy on light glass, a lighter rose on dark glass
  const darkGlass = Number(ink.ink.split(',')[0]) > 128
  return (
    <div
      className="lib-menu-wrap"
      style={{ '--lib-ink': ink.ink, '--lib-hi': ink.halo, '--lib-veil': ink.veil, '--lib-burgundy': darkGlass ? '255, 150, 175' : '128, 28, 58' }}
    >
      <div className="lib-menu" ref={glassRef} role="menu">
        <LiquidGlassPanel params={glassEdge} />
        {children}
      </div>
    </div>
  )
}
