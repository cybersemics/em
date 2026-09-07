/**
 * Regenerates public/'s Apple touch icon and Android/PWA manifest icons from
 * assets/icon-only.png, the same flat 1024x1024 icon source that `capacitor-assets` (see the
 * icons:native script) uses for the iOS app icon. Keeps the web and native icons from drifting
 * apart after a redesign.
 *
 * `public/favicon.ico`, favicon-16x16.png, and favicon-32x32.png are hand-maintained and not
 * touched here — they're tuned by hand for legibility at very small sizes, which a downscale
 * of the full icon doesn't reproduce well. `public/safari-pinned-tab.svg` is a hand-maintained
 * vector mask and is not touched here either.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const sourcePath = resolve(rootDir, 'assets', 'icon-only.png')
const publicDir = resolve(rootDir, 'public')

const pngTargets = [
  { filename: 'apple-touch-icon.png', size: 180 },
  { filename: 'android-chrome-192x192.png', size: 192 },
  { filename: 'android-chrome-512x512.png', size: 512 },
]

/** Renders the source icon to a square PNG buffer of the given pixel size. */
const renderPng = size => sharp(sourcePath).resize(size, size).png().toBuffer()

for (const { filename, size } of pngTargets) {
  await writeFile(resolve(publicDir, filename), await renderPng(size))
  console.info(`Wrote public/${filename} (${size}x${size})`)
}
