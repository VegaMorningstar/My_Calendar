/**
 * Ink colours for text that sits directly on the page's own colour.
 *
 * Reads the page colour from the glass layer's paper (see wwn-glass/index.js),
 * re-reads <body> once on mount in case the stylesheet landed late, and updates
 * whenever the paper colour changes afterwards.
 */
import { useEffect, useState } from 'react'
import { inkFor, cssColorLuma } from '../lib/adaptive-ink.js'
import { onPaperChange, paperColor, syncPaperFromBody } from '../wwn-glass/index.js'

/** @returns {{ ink: string, halo: string }} 'r, g, b' strings: text colour and its etching opposite. */
export default function usePageInk() {
  const [ink, setInk] = useState(() => inkFor(cssColorLuma(paperColor())))
  useEffect(() => {
    syncPaperFromBody()
    setInk(inkFor(cssColorLuma(paperColor())))
    return onPaperChange(css => setInk(inkFor(cssColorLuma(css))))
  }, [])
  return ink
}
