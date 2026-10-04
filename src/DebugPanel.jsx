/**
 * A small card of screen and page facts, opened by pressing and holding the "info" button for a
 * second. It exists so that layout problems that only appear on a real phone can be diagnosed from
 * a screenshot. Tap it to close.
 */
import { useEffect, useState } from 'react'
import { collectMetrics } from './diagnostics.js'

export default function DebugPanel({ onClose }) {
  const [metrics, setMetrics] = useState(collectMetrics)

  // Keep it live: rotating the phone or scrolling changes the numbers
  useEffect(() => {
    const update = () => setMetrics(collectMetrics())
    window.addEventListener('resize', update)
    const timer = setInterval(update, 1000)
    return () => { window.removeEventListener('resize', update); clearInterval(timer) }
  }, [])

  return (
    <div className="debug-panel" role="dialog" aria-label="Diagnostics" onClick={onClose}>
      <strong>Diagnostics (tap to close)</strong>
      <dl>
        {Object.entries(metrics).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </div>
  )
}
