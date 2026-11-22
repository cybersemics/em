#!/usr/bin/env node
/**
 * Replaces every `url("glow.jpg")` in an HTML file with the skill's glow.jpg as a data URI, in place.
 *
 * Usage: `embed-glow.mjs page.html`.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [file] = process.argv.slice(2)
if (!file) {
  console.error('Usage: embed-glow.mjs <page.html>')
  process.exit(1)
}

const glow = readFileSync(new URL('glow.jpg', import.meta.url)).toString('base64')
const html = readFileSync(file, 'utf8')
const count = html.split('url("glow.jpg")').length - 1
if (count === 0) {
  console.error(`No url("glow.jpg") found in ${file}`)
  process.exit(1)
}
writeFileSync(file, html.replaceAll('url("glow.jpg")', `url("data:image/jpeg;base64,${glow}")`))
console.error(`Embedded the glow in ${count} place(s) in ${file}`)
