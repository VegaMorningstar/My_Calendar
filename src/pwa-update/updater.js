/**
 * Finds out that a new version of an installed web app is ready, and swaps to it when the person says so. No framework: plain
 * browser code, so any project can use it (a React wrapper is in `useUpdate.js` and `UpdatePrompt.jsx`).
 *
 * A new version installs in the background and waits (the worker side is in the README: the worker must not skip waiting by
 * itself). This file notices it, tells whoever listens through `onUpdateReady`, and on `applyUpdate()` tells the waiting
 * worker to take over; when it does, the page reloads once. It also looks for a new version every time the app comes back to
 * the front, comes back online, and every 30 minutes, because an installed iPhone app is usually resumed, not relaunched, and
 * would otherwise only check when it is opened from scratch.
 *
 * Production builds only by default: in development a service worker would serve stale files and fight the hot reloader. The
 * worker's address is relative to the page, so it works from a domain root or from a GitHub Pages project path.
 */

/** How often (ms) a long-open app looks for a new version, besides when it comes to the front. */
const CHECK_EVERY_MS = 30 * 60 * 1000

// Vite fills these in; `?? {}` keeps other bundlers working (pass `enabled` and `swUrl` yourself there)
const env = import.meta.env ?? {}

let registration = null
let waiting = null // the worker holding the new version, once there is one
const listeners = new Set()

/**
 * Calls `fn` (now, if a new version is already waiting) whenever a new version is ready to take over.
 * @returns {() => void} stops listening
 */
export function onUpdateReady(fn) {
  listeners.add(fn)
  if (waiting) fn()
  return () => listeners.delete(fn)
}

/** Lets the waiting version take over; the page then reloads by itself. */
export function applyUpdate() {
  if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' })
  else window.location.reload()
}

/** Asks the browser to look for a new version now. */
export function checkForUpdate() {
  registration?.update().catch(() => { /* offline or the server is busy: try again next time */ })
}

function announce(worker) {
  waiting = worker
  listeners.forEach(fn => fn())
}

/**
 * Registers the service worker and starts watching for new versions. Call once, when the page starts.
 * @param {object}  [options]
 * @param {string}  [options.swUrl]         where the worker file is (default: `sw.js` under the page's base address)
 * @param {boolean} [options.enabled]       false does nothing (default: only in a production build)
 * @param {number}  [options.checkEveryMs]  how often a long-open app checks by itself (default: 30 minutes)
 */
export function registerServiceWorker({
  swUrl = `${env.BASE_URL ?? './'}sw.js`,
  enabled = env.PROD ?? true,
  checkEveryMs = CHECK_EVERY_MS,
} = {}) {
  if (!('serviceWorker' in navigator) || !enabled) return

  // The first time a worker takes control of this page (a first visit) must not reload it; every later change of
  // controller is an update the person asked for, and does
  let hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return }
    if (reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      // updateViaCache 'none': the browser never reuses its cached copy of sw.js when looking for a new version
      .register(swUrl, { updateViaCache: 'none' })
      .then(reg => {
        registration = reg
        if (reg.waiting && navigator.serviceWorker.controller) announce(reg.waiting)
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker)
          })
        })
        document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate() })
        window.addEventListener('focus', checkForUpdate)
        window.addEventListener('online', checkForUpdate)
        setInterval(checkForUpdate, checkEveryMs)
      })
      .catch(err => console.warn('Service worker registration failed:', err))
  })
}
