// Renders public/icons/icon.svg to the PNG sizes the PWA manifest and iOS need,
// using headless Chrome (no image libraries required). Run: npm run icons
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8')
const out = new URL('../public/icons/', import.meta.url).pathname
const dir = mkdtempSync(join(tmpdir(), 'icons-'))

// scale < 1 shrinks the artwork inside the canvas: maskable icons keep key content
// inside the central 80% so any platform mask can crop the edges safely.
const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.8 },
  { file: 'apple-touch-icon.png', size: 180, scale: 1 },
]

for (const { file, size, scale } of targets) {
  const page = join(dir, file + '.html')
  writeFileSync(page, `<!doctype html><body style="margin:0;background:#e7dcc8;display:grid;place-items:center;width:${size}px;height:${size}px;overflow:hidden">
    <div style="width:${size * scale}px;height:${size * scale}px">${svg.replace('<svg ', `<svg width="${size * scale}" height="${size * scale}" `)}</div></body>`)
  execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', `--window-size=${size},${size}`, '--force-device-scale-factor=1', `--screenshot=${out}${file}`, 'file://' + page], { stdio: 'ignore' })
  console.log('wrote', file)
}
