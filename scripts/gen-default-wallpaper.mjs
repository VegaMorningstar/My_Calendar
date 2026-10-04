// Draws the default wallpaper (frosted peach and light pastel blue) once, at build time, so the
// app ships it as a plain image file instead of drawing it on every launch. Uses headless
// Chrome, like gen-icons.mjs (no image libraries needed). Run: npm run default-wallpaper
//
// Writes:
//   public/wallpaper/default.jpg                        the wallpaper itself
//   src/photo-library/default-wallpaper-meta.json       its average colour, edge colours and a tiny
//                                                       blurred preview, which the page uses to
//                                                       paint itself before anything else loads
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const root = new URL('../', import.meta.url).pathname
const dir = mkdtempSync(join(tmpdir(), 'wallpaper-'))

// The drawing runs in the page. Colour fields alternate peach and pastel blue around the corners
// so a tall phone and a wide laptop both show both; a light haze and fine grain frost it.
const page = `<!doctype html><body><pre id="out"></pre><script>
const SIZE = 1400
const FIELDS = [
  [0.16, 0.2, 0.72, [150, 198, 250]],  // pastel blue, top left
  [0.86, 0.22, 0.62, [255, 183, 142]], // peach, top right
  [0.18, 0.84, 0.66, [255, 180, 138]], // peach, bottom left
  [0.84, 0.82, 0.62, [152, 200, 250]], // pastel blue, bottom right
  [0.5, 0.52, 0.5, [255, 205, 175]],   // a peach bridge through the middle
]
const canvas = document.createElement('canvas')
canvas.width = canvas.height = SIZE
const ctx = canvas.getContext('2d', { willReadFrequently: true })
ctx.fillStyle = '#f4ece6'
ctx.fillRect(0, 0, SIZE, SIZE)
for (const [cx, cy, radius, [r, g, b]] of FIELDS) {
  const x = cx * SIZE, y = cy * SIZE
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * SIZE)
  grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.95)')
  grad.addColorStop(0.6, 'rgba(' + r + ',' + g + ',' + b + ',0.55)')
  grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SIZE, SIZE)
}
const haze = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE * 0.6)
haze.addColorStop(0, 'rgba(255,255,255,0.26)')
haze.addColorStop(1, 'rgba(255,255,255,0.06)')
ctx.fillStyle = haze
ctx.fillRect(0, 0, SIZE, SIZE)
const tile = document.createElement('canvas')
tile.width = tile.height = 160
const tctx = tile.getContext('2d')
const img = tctx.createImageData(160, 160)
for (let i = 0; i < img.data.length; i += 4) { const v = 90 + Math.random() * 165; img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255 }
tctx.putImageData(img, 0, 0)
ctx.globalCompositeOperation = 'soft-light'
ctx.globalAlpha = 0.22
ctx.fillStyle = ctx.createPattern(tile, 'repeat')
ctx.fillRect(0, 0, SIZE, SIZE)
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'

// Average colour of a region of the canvas, as 'rgb(r, g, b)'
function average(sx, sy, sw, sh) {
  const small = document.createElement('canvas')
  small.width = small.height = 24
  const sctx = small.getContext('2d', { willReadFrequently: true })
  sctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, 24, 24)
  const px = sctx.getImageData(0, 0, 24, 24).data
  let r = 0, g = 0, b = 0
  for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i+1]; b += px[i+2] }
  const n = px.length / 4
  return 'rgb(' + Math.round(r/n) + ', ' + Math.round(g/n) + ', ' + Math.round(b/n) + ')'
}
const preview = document.createElement('canvas')
preview.width = preview.height = 48
preview.getContext('2d').drawImage(canvas, 0, 0, 48, 48)
document.getElementById('out').textContent = JSON.stringify({
  image: canvas.toDataURL('image/jpeg', 0.86),
  averageCss: average(SIZE * 0.2, SIZE * 0.2, SIZE * 0.6, SIZE * 0.6),
  top: average(0, 0, SIZE, SIZE * 0.04),
  bottom: average(0, SIZE * 0.96, SIZE, SIZE * 0.04),
  preview: preview.toDataURL('image/jpeg', 0.7),
})
</script></body>`
const file = join(dir, 'page.html')
writeFileSync(file, page)

const html = execFileSync(CHROME, ['--headless=new', '--virtual-time-budget=4000', '--dump-dom', 'file://' + file], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
const json = JSON.parse(html.match(/<pre id="out">([\s\S]*?)<\/pre>/)[1])

mkdirSync(join(root, 'public/wallpaper'), { recursive: true })
writeFileSync(join(root, 'public/wallpaper/default.jpg'), Buffer.from(json.image.split(',')[1], 'base64'))
writeFileSync(join(root, 'src/photo-library/default-wallpaper-meta.json'), JSON.stringify({
  averageCss: json.averageCss, top: json.top, bottom: json.bottom, preview: json.preview,
}, null, 2) + '\n')
console.log('wrote public/wallpaper/default.jpg and default-wallpaper-meta.json', { average: json.averageCss, top: json.top, bottom: json.bottom, previewChars: json.preview.length })
