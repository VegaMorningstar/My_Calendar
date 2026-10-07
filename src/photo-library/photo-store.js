/**
 * On-device storage for imported photos and settings, in the browser's IndexedDB.
 *
 * Everything stays inside this origin's storage on the device. Nothing here, or
 * anywhere in the import path, sends a photo over the network.
 *
 * A photo record looks like:
 *   { id, name, size, date: 'YYYY-MM-DD', blob: File, thumb: Blob | null }
 * Settings (such as the wallpaper) are stored by name in a second store.
 */
const DB_NAME = 'my-calendar'
const PHOTOS = 'photos'
const SETTINGS = 'settings'
const VERSION = 2 // 2 added the settings store

/** Opens (and on first use creates) the database. */
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Runs one transaction on `storeName`. `work` receives the object store and returns an IDBRequest. */
async function run(storeName, mode, work) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = work(tx.objectStore(storeName))
    tx.oncomplete = () => { db.close(); resolve(request.result) }
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error) }
  })
}

/** Saves (or replaces) one photo record. */
export const putPhoto = record => run(PHOTOS, 'readwrite', store => store.put(record))

/** True if a photo with this id is already stored. */
export const hasPhoto = async id => (await run(PHOTOS, 'readonly', store => store.getKey(id))) !== undefined

/** Every stored photo record. */
export const getAllPhotos = () => run(PHOTOS, 'readonly', store => store.getAll())

/** Deletes the photos with these ids, all in one transaction (so a failure leaves them all, not some). */
export const deletePhotos = ids => run(PHOTOS, 'readwrite', store => ids.map(id => store.delete(id)).at(-1) ?? store.count())

/** Deletes all stored photos. */
export const clearPhotos = () => run(PHOTOS, 'readwrite', store => store.clear())

/** Reads a saved setting by name, or undefined. */
export const getSetting = key => run(SETTINGS, 'readonly', store => store.get(key))

/** Saves a setting by name. */
export const putSetting = (key, value) => run(SETTINGS, 'readwrite', store => store.put(value, key))

/** Deletes a saved setting. */
export const deleteSetting = key => run(SETTINGS, 'readwrite', store => store.delete(key))

/**
 * Asks the browser not to evict this storage when the device is short on space.
 * Best effort: iOS may ignore it, but an installed home-screen app is the most protected.
 */
export async function requestPersistence() {
  try { return await navigator.storage?.persist?.() } catch { return false }
}
