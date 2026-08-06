/**
 * Regenerates public/'s favicon and PWA manifest icons from assets/icon-only.png, the same
 * flat 1024x1024 icon source that `capacitor-assets` (see the icons:native script) uses for
 * the iOS app icon. Keeps the web and native icons from drifting apart after a redesign.
 *
 * public/safari-pinned-tab.svg is a hand-maintained vector mask and is not touched here.
 */
import pngToIco from 'png-to-ico'
import { dirname, resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(rootDir, 'assets', 'icon-only.png')
const publicDir = resolve(rootDir, 'public')

const pngTargets = [
  { filename: 'apple-touch-icon.png', size: 180 },
  { filename: 'favicon-32x32.png', size: 32 },
  { filename: 'favicon-16x16.png', size: 16 },
  { filename: 'android-chrome-192x192.png', size: 192 },
  { filename: 'android-chrome-512x512.png', size: 512 },
]

const icoSizes = [16, 32, 48]

const renderPng = size => sharp(sourcePath).resize(size, size).png().toBuffer()

for (const { filename, size } of pngTargets) {
  await writeFile(resolve(publicDir, filename), await renderPng(size))
  console.info(`Wrote public/${filename} (${size}x${size})`)
}

const icoBuffers = await Promise.all(icoSizes.map(renderPng))
const icoBuffer = await pngToIco(icoBuffers)
await writeFile(resolve(publicDir, 'favicon.ico'), icoBuffer)

console.info(`Wrote public/favicon.ico (${icoSizes.join('/')})`)
