/**
 * Registers the service worker that makes the app installable and offline-capable.
 *
 * Production builds only: in development a service worker would serve stale
 * files and fight the hot reloader. The path is relative to the page, so it works
 * from a domain root or from a GitHub Pages project path.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(err => console.warn('Service worker registration failed:', err))
  })
}
