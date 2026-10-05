/**
 * The month grid with Write-With-Nature's liquid glass tiles for the dates.
 *
 * One canvas sits under the grid and draws every date box as a glass tile, using the shader and
 * springs behind WWN's glass alphabet: the rim bends and splits what is behind it, a box wobbles
 * when the pointer crosses it, and presses squash it. The date number is drawn inside the glass
 * (so it is refracted and picks light or dark ink from what is behind it), and the day's photos
 * are painted into the backdrop (photoLayer.js), so a photo is bent at its tile's edge too.
 *
 * The date boxes themselves stay in the page as transparent, focusable buttons: they are the hit
 * targets, they carry the weekday and the photo count, and they are the whole look if WebGPU is
 * missing or fails to start (`data-glass` stays "off" and the CSS tiles show instead).
 *
 * Boxes register themselves through useGlassTile (tilesContext.js). Each frame this reads their
 * positions from the layout, so the glass follows the grid as it resizes, scrolls or animates.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BUTTON_MATERIAL, POINTER_DEFAULTS, Spring, glassSupported, liftProperties, loadTileGlass, squashProperties,
} from '../wwn-glass/index.js'
import { GlassTilesContext } from './tilesContext.js'
import { paintPhotoLayer, removePhotoLayer } from './photoLayer.js'

/** Most date boxes a month can have. Fixed for the life of the shader. */
const MAX_TILES = 31
/** Size of the textures the shader reads: the letters, and the backdrop it refracts. */
const MASK_W = 1536
const MASK_H = 1024

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** The look of the glass: WWN's toolbar button material, with the rim, bend and ink set per frame from the tile size. */
const TILE_MATERIAL = {
  ...BUTTON_MATERIAL,
  letterWeight: 600,
  // The shader picks dark or light ink from what is behind a number. A narrow band (a firm switch,
  // not a blend) matches how every other piece of text in the calendar chooses its colour.
  inkLumLo: 0.495,
  inkLumHi: 0.505,
  // No tint: the body of an empty tile is clear glass, the wallpaper seen straight through it. The tile
  // is made visible by the bevel alone, a bright highlight along the rim (the shader fades it out over the body).
  tintR: 1, tintG: 1, tintB: 1, tintStrength: 0,
  specularStrength: 0.8, specularPower: 20,
}

/** No tint: used by tiles that show a photo, which must be seen through clear glass. */
const CLEAR_TINT = { r: 1, g: 1, b: 1, strength: 0 }

/** A faint teal in today's tile. */
const TODAY_TINT = { r: 0x3c / 255, g: 0xb4 / 255, b: 0xaa / 255, strength: 0.22 }
export const todayTint = TODAY_TINT

/**
 * @param {string}  className  classes for the grid element
 * @param {string}  animKey    changes when the page changes, to replay the entry animation
 * @param {boolean} [enabled]  false renders a plain grid with no glass
 */
export default function GlassTileGrid({ className = '', animKey, enabled = true, children }) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const tiles = useRef(new Map()) // element -> function returning its current info
  const springs = useRef(new Map()) // element -> { squash, lift }
  const hovered = useRef(null)
  const [ready, setReady] = useState(false)

  const registry = useMemo(() => ({
    register(el, getInfo) {
      tiles.current.set(el, getInfo)
      springs.current.set(el, { squash: new Spring(squashProperties), lift: new Spring(liftProperties) })
      return () => { tiles.current.delete(el); springs.current.delete(el); if (hovered.current === el) hovered.current = null }
    },
  }), [])

  // Replay the entry animation when the page changes (the grid itself stays mounted)
  useEffect(() => {
    const el = hostRef.current
    el.style.animation = 'none'
    void el.offsetWidth // force a reflow so the animation restarts
    el.style.animation = ''
  }, [animKey])

  // ── The glass ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !glassSupported) return undefined
    const host = hostRef.current
    const canvas = canvasRef.current
    let cancelled = false
    let cleanup = null

    ;(async () => {
      try {
        const [{ tgpu }, { setupTileGlass, createTileBackdrop }] = await Promise.all([import('typegpu'), loadTileGlass()])
        if (cancelled) return
        const backdrop = createTileBackdrop()
        // A larger letter texture than WWN's default: the numbers are small, and this canvas is large
        backdrop.letters.width = MASK_W
        backdrop.letters.height = MASK_H
        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupTileGlass(root, context, backdrop.paper, backdrop.letters, {
          tileCount: MAX_TILES, maskW: MASK_W, maskH: MASK_H,
        })
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        let last = 0
        scene.beforeFrame = () => {
          const rect = host.getBoundingClientRect()
          if (!rect.width || !rect.height) return
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          const cw = Math.max(2, Math.round(rect.width * dpr))
          const ch = Math.max(2, Math.round(rect.height * dpr))
          if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; scene.invalidate('canvas-resized') } // resizing clears the canvas
          scene.setShapeScale(rect.width, rect.height)
          backdrop.resize(rect, dpr)
          const H = rect.height

          // Springs, in small fixed steps (explicit Euler on springs this stiff blows up past about 60ms)
          const now = performance.now()
          const dt = Math.min(last ? (now - last) / 1000 : 0, 0.1)
          last = now
          const steps = Math.min(Math.ceil(dt / (1 / 240)), 32)
          const stepDt = steps ? dt / steps : 0
          for (const s of springs.current.values()) {
            for (let k = 0; k < steps; k++) { s.squash.step(stepDt); s.lift.step(stepDt) }
          }

          // Read every box's place from the layout
          const entries = []
          for (const [el, getInfo] of tiles.current) {
            if (!el.isConnected) continue
            entries.push({ el, info: getInfo(), x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, s: springs.current.get(el) })
          }
          if (!entries.length) { scene.setTiles([]); return }

          // The glass is sized from the boxes (they are all the same size): rim, bend and corner follow the tile
          const side = Math.min(entries[0].w, entries[0].h)
          const edge = clamp(side * 0.085, 3.5, 8.5)
          const radius = clamp(side * 0.2, 6, 16)
          // Px of displacement at the rim (the shader wants it in canvas heights). Negative: a rim pulls in
          // the picture from inside its own tile. Positive pulls from outside, and with gaps this small
          // that is the neighbouring tile, which shows as slivers of the wrong picture along every edge.
          const bend = -clamp(side * 0.24, 7, 22) * 0.6
          const mm = { ...TILE_MATERIAL, edge, ringStart: edge * 0.34, radius }
          const halfBox = Math.max(side / 2 - edge, 0.5)
          const fontSize = clamp(side * 0.2, 13, 24)

          const glyphs = []
          const shaderTiles = []
          const photoTiles = []
          for (const { el, info, x, y, w, h, s } of entries) {
            const sq = s.squash.value
            const ly = s.lift.value
            // The box follows the glass, so what is pressed is what is seen
            el.style.transform = `translateY(${(-ly * 40).toFixed(2)}px) scale(${(1 + sq).toFixed(4)}, ${(1 - sq * 0.7).toFixed(4)})`

            const cx = x + w / 2
            const cy = y + h / 2 - ly * 40
            const hx = (w / 2) * (1 + sq) - edge
            const hy = (h / 2) * (1 - sq * 0.7) - edge
            const pressed = Math.min((Math.abs(s.squash.velocity) * 0.05 + Math.abs(sq) * 1.4) * POINTER_DEFAULTS.glowGain, 1.2)
            const layers = info.getLayers ? info.getLayers() : []
            // A tile showing a photo takes no tint at all, so the picture is seen through clear glass
            shaderTiles.push({ cx: cx / H, cy: cy / H, hx: hx / H, hy: hy / H, glow: Math.min(pressed, 3), tint: layers.length ? CLEAR_TINT : info.tint })

            // The number, top left of the tile
            const padX = Math.max(7, side * 0.1)
            const padY = Math.max(6, side * 0.08)
            const digits = String(info.label).length
            glyphs.push({
              letter: info.label,
              x: cx - w / 2 + padX + (digits * fontSize * 0.58) / 2,
              y: cy - h / 2 + padY + fontSize * 0.55,
              alpha: 1,
            })

            if (layers.length) photoTiles.push({ x: rect.left + cx - w / 2, y: rect.top + cy - h / 2, w, h, r: radius, layers })
          }
          // Pad to the fixed count with tiles far off the canvas
          while (shaderTiles.length < MAX_TILES) shaderTiles.push({ cx: -9, cy: -9, hx: 0.0005, hy: 0.0005, glow: 0 })
          scene.setTiles(shaderTiles)

          scene.setParams({
            radius: Math.min(Math.max(0, mm.radius - mm.edge) / H, halfBox / H),
            start: mm.ringStart / H,
            end: Math.max(mm.edge / H, 0.0005),
            chromaticStrength: (bend * 0.1) / H,
            refractionStrength: bend / H,
            blur: mm.blur,
            edgeFeather: mm.edgeFeather,
            edgeBlurMultiplier: mm.edgeBlurMultiplier,
            tintStrength: mm.tintStrength,
            tintR: mm.tintR, tintG: mm.tintG, tintB: mm.tintB,
            chromaticFalloff: mm.chromaticFalloff,
            edgeCurve: mm.edgeCurve,
            bodyChromatic: mm.bodyChromatic,
            bodyDepth: halfBox / H,
            letterBlur: mm.letterBlur,
            letterR: mm.letterR, letterG: mm.letterG, letterB: mm.letterB,
            letterLightR: mm.letterLightR, letterLightG: mm.letterLightG, letterLightB: mm.letterLightB,
            inkLumLo: mm.inkLumLo,
            inkLumHi: mm.inkLumHi,
            inkSampleLevel: mm.inkSampleLevel,
            glowStrength: mm.glowStrength,
            glowHalo: mm.glowHalo / H,
            glowInk: 0,
            glowInkLevel: mm.glowInkLevel ?? 2.8,
            glowR: mm.glowR, glowG: mm.glowG, glowB: mm.glowB,
            lightAzimuth: mm.lightAzimuth,
            lightElevation: mm.lightElevation,
            specularStrength: mm.specularStrength,
            specularPower: mm.specularPower,
            specR: mm.specR, specG: mm.specG, specB: mm.specB,
          })

          // Photos go into the layer first, because backdrop.update composites it over the wallpaper
          paintPhotoLayer(photoTiles)
          // The backdrop repaints only what changed and says so; then the scene has to draw again
          if (backdrop.update(glyphs, { size: fontSize, weight: mm.letterWeight, opacity: mm.letterOpacity, family: mm.letterFamily })) scene.invalidate('backdrop-repainted')
        }

        cleanup = () => { scene.onCleanup(); root.destroy() }
        if (!cancelled) setReady(true)
      } catch (err) {
        // The CSS tiles stay as they are; only the glass is lost
        console.warn('[GlassTileGrid] glass failed to start, keeping the plain tiles:', err)
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
      removePhotoLayer()
      for (const el of tiles.current.keys()) el.style.transform = ''
      setReady(false)
    }
  }, [enabled])

  // ── Pointer: wobble and lift on hover, squash on press ─────────────────────────
  const tileOf = target => target.closest?.('[data-glass-tile]')
  const enter = el => {
    const s = el && springs.current.get(el)
    if (!s) return
    s.squash.velocity += POINTER_DEFAULTS.hoverImpulse * 6
    s.lift.velocity += POINTER_DEFAULTS.hoverImpulse * 3
    s.lift.target = POINTER_DEFAULTS.hoverLift / 40
  }
  const leave = el => { const s = el && springs.current.get(el); if (s) s.lift.target = 0 }

  return (
    <GlassTilesContext.Provider value={enabled ? registry : null}>
      <div
        ref={hostRef}
        className={className}
        data-glass={ready ? 'on' : 'off'}
        onPointerOver={e => {
          const el = tileOf(e.target)
          if (el === hovered.current) return
          leave(hovered.current)
          hovered.current = el
          enter(el)
        }}
        onPointerLeave={() => { leave(hovered.current); hovered.current = null }}
        onPointerDown={e => {
          const s = springs.current.get(tileOf(e.target))
          if (!s) return
          s.squash.velocity -= POINTER_DEFAULTS.clickImpulse * 8
          s.lift.velocity += POINTER_DEFAULTS.clickImpulse * 4
        }}
      >
        <canvas ref={canvasRef} className="pc-glass-canvas" aria-hidden="true" />
        {children}
      </div>
    </GlassTilesContext.Provider>
  )
}
