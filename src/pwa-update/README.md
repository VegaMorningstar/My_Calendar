# pwa-update

"New version available, tap to reload" for an installed web app (PWA), as one folder that can be copied into another project.
Nothing in it knows about this calendar.

An installed iPhone app is usually resumed, not relaunched, so without this it can run old code for days. With it: a new
version downloads in the background and **waits**; a small prompt appears; one tap switches to it and reloads once. Nothing
is deleted under a page that is still running, and data the app keeps on the device (IndexedDB, localStorage) is untouched.
The app also looks for a new version whenever it comes to the front, comes back online, and every 30 minutes.

## What is in the folder

| File | What it is |
|---|---|
| `updater.js` | The whole mechanism, no framework: `registerServiceWorker()`, `onUpdateReady(fn)`, `applyUpdate()`, `checkForUpdate()` |
| `useUpdate.js` | React hook: `{ ready, busy, apply }` |
| `UpdatePrompt.jsx`, `update-prompt.css` | A ready-made prompt (a plain pill at the bottom centre). Props: `label`, `busyLabel`, `title`, `className`, `renderButton` |
| `index.js` | The only file to import from |

Not React? Use `updater.js` on its own and draw your own message. Not Vite? Pass `registerServiceWorker({ swUrl, enabled })`
(the defaults read Vite's `import.meta.env.BASE_URL` and `PROD`).

## Using it in another project

1. Copy this folder into `src/`.
2. At start-up: `import { registerServiceWorker } from './pwa-update'` and call `registerServiceWorker()`.
3. Somewhere in the app: `<UpdatePrompt />`. To use the app's own button look, pass `renderButton` (and `className` to position
   the wrapper), as `src/App.jsx` and `src/UpdateButton.jsx` do here.
4. The service worker (`public/sw.js` here) needs three small things, the other half of the feature:

   ```js
   const VERSION = '__SW_VERSION__'  // changes on every deploy, so the browser sees a new sw.js (see 5)

   self.addEventListener('install', event => {
     event.waitUntil(
       cacheTheNewFiles()  // whatever the worker precaches
         // a first install has nothing to wait for; an update waits for the page's go-ahead
         .then(() => { if (!self.registration.active) return self.skipWaiting() }),
     )
   })

   // Sent by applyUpdate() when the person taps the prompt
   self.addEventListener('message', event => {
     if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
   })
   ```

   The worker must never call `skipWaiting()` by itself on an update, or the prompt has nothing to wait for. Delete old caches
   in `activate`, and `self.clients.claim()`.
5. The build must change `sw.js` on every deploy, or the browser sees nothing new. Here `pwaPrecache()` in `vite.config.js`
   writes a hash of the built files into `__SW_VERSION__` (and the file list into the precache list).
6. On GitHub Pages (which serves everything with `max-age=600`): `registerServiceWorker` registers with
   `updateViaCache: 'none'`, and the worker installs with `fetch(url, { cache: 'reload' })` and answers page loads with
   `{ cache: 'no-cache' }`, so a deploy shows up at once and not ten minutes later. Keep those in the worker.

## Testing it

It cannot be tried in the dev server (the worker only registers in production builds). Build one version, serve it, open it,
deploy the next build to the same address, then bring the page to the front (or dispatch `focus`): the prompt appears, the
page still shows the old version, a tap reloads exactly once into the new one, and the old cache is deleted.
