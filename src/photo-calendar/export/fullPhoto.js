/**
 * Loads a photo's full-size original and shrinks it to exactly the box it is drawn in on the saved page.
 *
 * The originals are big (a 12 megapixel photo is about 48 MB once decoded), and a month can have 31 of them, so they are never
 * all held at once: each one is decoded, cropped to its box (cover, like everywhere else in the app) and let go, and only the
 * small result is kept. The shrinking is done in steps of at most half, which keeps edges and fine detail clean; one big jump
 * from 4000 pixels down to 400 would alias.
 */

/** Fetches the photo behind `url` (an object URL for the stored original) and decodes it, upright. */
async function decodeOriginal(url) {
  const blob = await (await fetch(url)).blob()
  // 'from-image' applies the photo's rotation, so upright phone photos stay upright
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

/**
 * @param {string} url  where the full-size photo can be read
 * @param {number} w  the box's width in output pixels
 * @param {number} h  the box's height in output pixels
 * @returns {Promise<HTMLCanvasElement>} a w x h canvas holding the photo, cropped to cover the box
 */
export async function fullPhotoFor(url, w, h) {
  w = Math.max(1, Math.round(w))
  h = Math.max(1, Math.round(h))
  const bitmap = await decodeOriginal(url)
  try {
    // The part of the photo that covers the box
    const k = Math.max(w / bitmap.width, h / bitmap.height)
    const sw = w / k
    const sh = h / k
    let sx = (bitmap.width - sw) / 2
    let sy = (bitmap.height - sh) / 2
    let source = bitmap
    // Halve until the next step would be at most 2x, then draw to the final size
    let cw = sw
    let ch = sh
    while (cw / 2 >= w && ch / 2 >= h) {
      const nw = Math.max(w, Math.floor(cw / 2))
      const nh = Math.max(h, Math.floor(ch / 2))
      const step = document.createElement('canvas')
      step.width = nw
      step.height = nh
      const g = step.getContext('2d')
      g.imageSmoothingQuality = 'high'
      g.drawImage(source, sx, sy, cw, ch, 0, 0, nw, nh)
      if (source !== bitmap) source.width = source.height = 0
      source = step
      sx = 0
      sy = 0
      cw = nw
      ch = nh
    }
    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    const g = out.getContext('2d')
    g.imageSmoothingQuality = 'high'
    g.drawImage(source, sx, sy, cw, ch, 0, 0, w, h)
    if (source !== bitmap) source.width = source.height = 0
    return out
  } finally {
    bitmap.close?.()
  }
}
