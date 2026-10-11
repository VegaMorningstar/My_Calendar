/**
 * The "new version available, tap to reload" feature, as one piece that can be copied into another project (see README.md).
 * Import it only through this file.
 */
export { registerServiceWorker, onUpdateReady, applyUpdate, checkForUpdate } from './updater.js'
export { default as useUpdate } from './useUpdate.js'
export { default as UpdatePrompt } from './UpdatePrompt.jsx'
