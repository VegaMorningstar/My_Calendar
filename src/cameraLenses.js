/**
 * Which cameras a phone has, sorted into the ones the phone camera offers: front, and on the back the ordinary (main) lens and the
 * ultra wide. A phone names its cameras ("Front Camera", "Back Camera", "Back Ultra Wide Camera", "Back Telephoto Camera", and the
 * combined "Back Dual Camera" / "Back Triple Camera"), but only once the camera has been allowed, so this is asked after the
 * first picture is live. The combined ones are left out: they are the same lenses again.
 * The telephoto lens is found but not offered: a page cannot be told how strong it is (2x, 3x, 5x), and a wrong label is worse than none.
 */

/** @returns {Promise<{front: string|null, main: string|null, ultra: string|null}>}  camera ids, null where the phone has none */
export async function listLenses() {
  const out = { front: null, main: null, ultra: null }
  try {
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput' && d.deviceId)
    for (const d of cams) {
      const label = d.label.toLowerCase()
      if (/front|user|face/.test(label)) out.front ??= d.deviceId
      else if (/ultra/.test(label)) out.ultra ??= d.deviceId
      else if (/tele|dual|triple|virtual/.test(label)) continue
      else out.main ??= d.deviceId
    }
  } catch { /* no list: the camera still works by facing */ }
  return out
}
