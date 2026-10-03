// Lists public/photos into public/photos/manifest.json. A photo's date comes
// from its filename (…_YYYY-MM-DD.ext), which the calendar parses itself, so
// the manifest is only a list of URLs. Swap this out for a real source later.
import { readdirSync, writeFileSync } from 'node:fs'

const dir = new URL('../public/photos/', import.meta.url)
const files = readdirSync(dir)
  .filter(f => /\.(webp|jpe?g|png|avif)$/i.test(f))
  .sort()
writeFileSync(new URL('manifest.json', dir), JSON.stringify(files.map(f => `photos/${f}`), null, 2) + '\n')
console.log(`manifest: ${files.length} photos`)
