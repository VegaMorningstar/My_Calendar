/**
 * Registers the service worker that makes the app installable and offline-capable, and tells the page when a new
 * version is ready.
 *
 * A new version installs in the background and waits (see public/sw.js). This file notices it, asks the page to
 * show "New version available, tap to reload" (UpdatePrompt), and on the tap tells the waiting worker to take over;
 * when it does, the page reloads once. It also looks for a new version every time the app comes back to the front,
 * because an installed iPhone app is usually resumed, not relaunched, and would otherwise only check when it is
 * opened from scratch.
 *
 * Production builds only: in development a service worker would serve stale files and fight the hot reloader. The
 * path is relative to the page, so it works from a domain root or from a GitHub Pages project path.
 */

/** How often (ms) a long-open app looks for a new version, besides when it comes to the front. */
const CHECK_EVERY_MS = 30 * 60 * 1000

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

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

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
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
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
        setInterval(checkForUpdate, CHECK_EVERY_MS)
      })
      .catch(err => console.warn('Service worker registration failed:', err))
  })
}
