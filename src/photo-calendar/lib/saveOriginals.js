/**
 * Hands the person their original photos, at the full size they were stored.
 *
 * On a phone or tablet it opens the share sheet with the files (its "Save Image" puts them in the Photos app, and it can also send
 * them elsewhere). On a computer it downloads them. A web page cannot write straight into the Photos library, so the share sheet is
 * the way in.
 */

/**
 * @param {File[]} files  the original files, as they were imported or taken
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export async function saveOriginals(files) {
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
      // anything else: fall back to downloads
    }
  }
  const used = new Set()
  for (const file of files) {
    // Two photos with one name (taken on different days) must not overwrite each other
    let name = file.name || 'photo.jpg'
    for (let n = 2; used.has(name); n++) name = file.name.replace(/(\.[^.]*)?$/, ` ${n}$1`)
    used.add(name)
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 15000)
    await new Promise(r => setTimeout(r, 250)) // browsers drop downloads that arrive all at once
  }
  return 'downloaded'
}
