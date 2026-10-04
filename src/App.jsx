/**
 * The demo page: the photo calendar, and along the bottom left a gear (photos and
 * wallpaper settings) with the info button beside it.
 *
 * The calendar shows whatever photos the user has imported from their device,
 * on top of the wallpaper they chose (or the frosted default), which is painted on the page root.
 */
import { useEffect, useState } from 'react'
import { viewportDeficit } from './diagnostics.js'
import { PhotoCalendar, WALLPAPER_OVERSCAN_PX, bottomEdgeColor, setBackgroundImage, topEdgeColor } from './photo-calendar/index.js'
import { LibraryHint, LibraryNote, SettingsMenu, rememberWallpaperEdges, usePhotoLibrary, useWallpaper } from './photo-library/index.js'

/**
 * True when the page runs under the iPhone status bar. Then the top safe-area inset is more
 * than 0: in the old Home Screen mode (and in a browser tab) it is 0, because the page
 * starts below the bar, and a fade placed there would sit on the page and tint the bar grey.
 */
function useRunsUnderStatusBar() {
  const [under, setUnder] = useState(false)
  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top)'
    document.body.appendChild(probe)
    setUnder(parseFloat(getComputedStyle(probe).paddingTop) > 0)
    probe.remove()
  }, [])
  return under
}

/**
 * Paints the wallpaper on the page itself (the root element's background) and keeps the colours
 * around it in step. Returns the colour along the top edge of the wallpaper.
 *
 * Why the root background and not a fixed <div> behind the content: on iPhone, a Home Screen app
 * can report a page height a little shorter than the screen, and a fixed element is cut off at
 * that height, leaving a bar of plain colour along the bottom (and a taller element does not help,
 * it is clipped). The root background is painted across the whole screen whatever that height is.
 *
 * The image is sized like CSS `cover` but over a box 120px taller than the viewport
 * (WALLPAPER_OVERSCAN_PX), anchored at the top, which is exactly the crop the glass refracts. So a
 * square photo fills the height, and its sides run off the edges: it is cropped, never stretched.
 *
 * Also writes the top edge's colour to the theme-color tag (iOS tints the status bar from it),
 * and remembers both edge colours for the next launch's early paint (see index.html).
 */
function usePageBackdrop(wallpaper) {
  const [topColor, setTopColor] = useState(null)
  useEffect(() => {
    const { url, fullImage } = wallpaper
    if (!url || !fullImage?.naturalWidth) return
    const apply = () => {
      const viewportW = window.innerWidth
      const boxH = window.innerHeight + WALLPAPER_OVERSCAN_PX
      const scale = Math.max(viewportW / fullImage.naturalWidth, boxH / fullImage.naturalHeight)
      const w = fullImage.naturalWidth * scale
      const h = fullImage.naturalHeight * scale
      const top = topEdgeColor()
      const bottom = bottomEdgeColor()
      // When an installed iPhone app is given a viewport shorter than the screen, the strip below it
      // can only show the plain page colour, whatever the page paints. So the wallpaper's last stretch
      // fades into that colour and the strip reads as part of the picture, not as a bar.
      const deficit = viewportDeficit()
      const fade = deficit >= 20
        ? `linear-gradient(to bottom, ${bottom.replace('rgb(', 'rgba(').replace(')', ', 0)')}, ${bottom}) 0 100% / 100% ${deficit + 60}px no-repeat, `
        : ''
      // The fade (if any), the image, then the bottom edge's colour behind it for anything it does not reach
      document.documentElement.style.background =
        `${fade}url("${url}") ${(viewportW - w) / 2}px ${(boxH - h) / 2}px / ${w}px ${h}px no-repeat, ${bottom}`
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', top)
      setTopColor(top)
      if (!wallpaper.isDefault) rememberWallpaperEdges(top, bottom)
    }
    apply()
    // The blurred preview that index.html painted first fades out, uncovering the sharp image
    const early = document.getElementById('early-wallpaper')
    let timer
    if (early) {
      early.style.transition = 'opacity .5s ease'
      early.style.opacity = '0'
      timer = setTimeout(() => early.remove(), 600)
    }
    window.addEventListener('resize', apply)
    return () => { clearTimeout(timer); window.removeEventListener('resize', apply) }
  }, [wallpaper.url, wallpaper.fullImage, wallpaper.averageCss]) // eslint-disable-line react-hooks/exhaustive-deps
  return topColor
}

export default function App() {
  const library = usePhotoLibrary()
  const underStatusBar = useRunsUnderStatusBar()
  const wallpaper = useWallpaper()

  // The glass refracts the wallpaper, not just the page colour, so it is told about it too
  useEffect(() => {
    setBackgroundImage(wallpaper.image, wallpaper.averageCss)
  }, [wallpaper.image, wallpaper.averageCss])

  // Declared after the effect above, so the glass already knows the wallpaper when this reads its colours
  const topColor = usePageBackdrop(wallpaper)

  // While the calendar is empty, a hint line hangs under it; the calendar leaves room for that
  const emptyLibrary = library.photos.length === 0 && library.progress === null

  return (
    <main className="stage" style={{ '--pc-extra-height': emptyLibrary ? '56px' : '0px' }}>
      {underStatusBar && <div className="app-status-scrim" aria-hidden="true" />}
      {/* A thin strip in the wallpaper's top-edge colour, there for iOS to tint the status bar from.
          Only needed when the page cannot run under the bar; when it does, the strip would show as a band. */}
      {!underStatusBar && topColor && <div className="app-top-strip" style={{ background: topColor }} aria-hidden="true" />}
      <div className="stage-column">
        {/* The hint hangs below the calendar without taking space, so the calendar itself stays centred */}
        <div className="stage-calendar">
          <PhotoCalendar photos={library.photos} />
          <LibraryHint library={library} />
        </div>
      </div>
      <div className="stage-footer">
        <SettingsMenu library={library} wallpaper={wallpaper} />
        <LibraryNote />
      </div>
    </main>
  )
}
