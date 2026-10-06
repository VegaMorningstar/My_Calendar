import { writeWallpaperHint } from './wallpaper.js'

/**
 * Public API of the photo library: picking photos from the device, reading their
 * dates, keeping them on the device, and the page wallpaper. Import from this file only.
 */
export { default as usePhotoLibrary } from './usePhotoLibrary.js'
export { default as SettingsMenu } from './SettingsMenu.jsx'
export { default as useWallpaper } from './useWallpaper.js'

/** Remembers the wallpaper's top and bottom edge colours for the next launch's early paint. */
export const rememberWallpaperEdges = (top, bottom) => writeWallpaperHint({ top, bottom })
export { default as LibraryHint } from './LibraryHint.jsx'
export { captureDate } from './exif-date.js'
