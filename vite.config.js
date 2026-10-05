import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import typegpu from 'unplugin-typegpu/vite'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const defaultWallpaper = JSON.parse(readFileSync(new URL('./src/photo-library/default-wallpaper-meta.json', import.meta.url), 'utf8'))

/**
 * Where the app is served from.
 *
 * './' makes every asset URL relative, so the same build works from a domain root,
 * from a GitHub Pages project path (user.github.io/My_Callendar/) or from a
 * subfolder, with no setting to change. Set BASE_PATH only to force an absolute base.
 */
const BASE = process.env.BASE_PATH ?? './'

/** All files under `dir`, as paths relative to it. */
function walk(dir, root = dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full, root) : [relative(root, full)]
  })
}

/**
 * Fills the service worker's placeholders after the build: the app shell file
 * list to precache, and a version hash of it so every deploy gets a fresh cache.
 */
function pwaPrecache() {
  let outDir = 'dist'
  return {
    name: 'pwa-precache',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir },
    writeBundle() {
      const files = walk(outDir)
        .filter(f => f !== 'sw.js')
        .sort()
      const version = createHash('sha1')
        .update(files.map(f => f + statSync(join(outDir, f)).size).join('|'))
        .update(readFileSync(join(outDir, 'index.html')))
        .digest('hex').slice(0, 10)
      const swPath = join(outDir, 'sw.js')
      const sw = readFileSync(swPath, 'utf8')
        .replace("'__PRECACHE_LIST__'", JSON.stringify(files))
        .replace('__SW_VERSION__', version)
      writeFileSync(swPath, sw)
    },
  }
}

/** Fills the default wallpaper's preview and colours into index.html's early-paint script. */
function defaultWallpaperInHtml() {
  return {
    name: 'default-wallpaper-in-html',
    transformIndexHtml: html => html
      .replaceAll('%DEFAULT_PREVIEW%', defaultWallpaper.preview)
      .replaceAll('%DEFAULT_AVERAGE%', defaultWallpaper.averageCss)
      .replaceAll('%DEFAULT_TOP%', defaultWallpaper.top)
      .replaceAll('%DEFAULT_BOTTOM%', defaultWallpaper.bottom),
  }
}

// unplugin-typegpu compiles the glass shaders and has to come before the React plugin.
export default defineConfig({
  base: BASE,
  // When this build was made: shown on the diagnostics card, so it is easy to tell which version a phone is running
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: [typegpu({ include: [/\.m?[jt]sx?/] }), react(), defaultWallpaperInHtml(), pwaPrecache()],
})
