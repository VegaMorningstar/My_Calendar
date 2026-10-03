/**
 * On-device storage for imported photos, in the browser's IndexedDB.
 *
 * Everything stays inside this origin's storage on the device. Nothing here, or
 * anywhere in the import path, sends a photo over the network.
 *
 * A record looks like:
 *   { id, name, size, date: 'YYYY-MM-DD', blob: File, thumb: Blob | null }
 */
const DB_NAME = 'my-calendar'
const STORE = 'photos'
const VERSION = 1

/** Opens (and on first use creates) the database. */
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Runs one transaction. `work` receives the object store and returns an IDBRequest. */
async function run(mode, work) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = work(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); resolve(request.result) }
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error) }
  })
}

/** Saves (or replaces) one photo record. */
export const putPhoto = record => run('readwrite', store => store.put(record))

/** True if a photo with this id is already stored. */
export const hasPhoto = async id => (await run('readonly', store => store.getKey(id))) !== undefined

/** Every stored photo record. */
export const getAllPhotos = () => run('readonly', store => store.getAll())

/** Deletes all stored photos. */
export const clearPhotos = () => run('readwrite', store => store.clear())

/**
 * Asks the browser not to evict this storage when the device is short on space.
 * Best effort: iOS may ignore it, but an installed home-screen app is the most protected.
 */
export async function requestPersistence() {
  try { return await navigator.storage?.persist?.() } catch { return false }
}
