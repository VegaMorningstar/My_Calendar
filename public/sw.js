/**
 * Service worker: makes the calendar installable and usable offline.
 *
 * - App shell: every built file is precached at install. The list below is filled
 *   in at build time by the `pwa-precache` plugin in vite.config.js (the
 *   placeholder is replaced in dist/sw.js), and the cache name carries a hash of
 *   it, so each deploy gets a fresh cache and the old one is deleted.
 * - Pages: network first (skipping the browser's own 10 minute cache, so a deploy shows up at once), falling back to
 *   the cached app shell when offline.
 * - Updates: a new version is installed in the background and then WAITS. The page shows "New version available, tap to
 *   reload"; tapping it sends SKIP_WAITING, the new version takes over and the page reloads. Nothing is deleted under a
 *   page that is still running. The very first install has nothing to wait for and activates at once.
 * - Google Fonts: stale-while-revalidate.
 *
 * Everything is relative to the worker's own location, so the app works from a
 * domain root or from a GitHub Pages project path alike.
 */
const VERSION = '__SW_VERSION__'
const PRECACHE = '__PRECACHE_LIST__'
const SHELL_CACHE = `shell-${VERSION}`
const FONT_CACHE = 'fonts-v1'

const scope = self.registration.scope // always ends with '/'
const urlOf = path => new URL(path, scope).href

self.addEventListener('install', event => {
  const list = Array.isArray(PRECACHE) ? PRECACHE : []
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // cache: 'reload' skips the browser's own cache, which on GitHub Pages can hold the previous main page for 10 minutes
      .then(cache => Promise.all(['./', ...list].map(urlOf).map(async url => {
        const response = await fetch(new Request(url, { cache: 'reload' }))
        if (!response.ok) throw new Error(`${url}: ${response.status}`)
        await cache.put(url, response)
      })))
      // An update waits for the page's go-ahead (see the message handler below); a first install has nothing to wait for
      .then(() => { if (!self.registration.active) return self.skipWaiting() }),
  )
})

// The page sends this when the person taps "New version available"
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        // Old app versions, and the sample-photo cache from before photos were imported on-device
        keys.filter(k => (k.startsWith('shell-') && k !== SHELL_CACHE) || k === 'photos-v1').map(k => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  )
})

/** Serve from the cache, filling it from the network on a miss. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

/** Try the network and keep the answer; use the cache if the network fails. */
async function networkFirst(request, cacheName, fallbackUrl, fetchOptions) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(fetchOptions ? request.url : request, fetchOptions)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    return (await cache.match(request)) || (fallbackUrl && (await cache.match(fallbackUrl))) || Promise.reject(err)
  }
}

/** Serve the cached copy at once and refresh it in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  const refresh = fetch(request).then(response => {
    if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
    return response
  }).catch(() => hit)
  return hit || refresh
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Fonts come from Google, a different origin
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE))
    return
  }
  if (url.origin !== self.location.origin) return

  // Page loads
  if (request.mode === 'navigate') {
    // no-cache: always ask the server if the page changed (cheap when it has not), never trust the 10 minute copy
    event.respondWith(networkFirst(request, SHELL_CACHE, urlOf('./'), { cache: 'no-cache' }))
    return
  }

  // Everything else is the built app (hashed assets, icons, manifest)
  event.respondWith(cacheFirst(request, SHELL_CACHE))
})
