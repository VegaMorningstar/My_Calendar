/**
 * React hook for the update flow (see updater.js): is a new version waiting, and a function that switches to it.
 * `busy` turns true once the person has asked, until the page reloads.
 */
import { useEffect, useState } from 'react'
import { applyUpdate, onUpdateReady } from './updater.js'

/** @returns {{ ready: boolean, busy: boolean, apply: () => void }} */
export default function useUpdate() {
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => onUpdateReady(() => setReady(true)), [])
  const apply = () => { setBusy(true); applyUpdate() }
  return { ready, busy, apply }
}
