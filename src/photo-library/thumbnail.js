/**
 * Small preview images, so the calendar never has to decode full-size photos.
 *
 * A 12 megapixel original is heavy to draw dozens of times in a month grid on a
 * phone. A preview about 720px on its long side is plenty for the grid and the
 * day view; the full photo is only used in the full-screen viewer.
 */

/** Longest side of a preview, in px. */
const MAX_SIDE = 720

/**
 * @param {Blob} file
 * @returns {Promise<Blob|null>} a JPEG preview, or null if the browser cannot decode the image
 */
export async function makeThumbnail(file) {
  try {
    // createImageBitmap applies the photo's EXIF rotation, so portraits stay upright
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  } catch {
    return null
  }
}
