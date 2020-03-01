import flow from 'lodash.flow'
import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals.js'
import emojiStrip from 'emoji-strip'
import * as pluralize from 'pluralize'
import _ from 'lodash'

const lower = s => s.toLowerCase()
const trim = s => s.replace(
  s.length > 0 && s.replace(/\W/g, '').length > 0 ? /\W/g : /s/g,
  ''
)
const strip = s => {
  const stripped = emojiStrip(s)
  return stripped.length > 0 ? stripped : s
}

/** Generate a hash of a thought with the following transformations:
  - case-insensitive
  - ignore punctuation & whitespace (when there is other text)
  - ignore emojis (when there is other text)
  - singularize
  - murmurhash to prevent large keys (Firebase limitation)
*/
// stored keys MUST match the current hashing algorithm
// use schemaVersion to manage migrations
export const hashThought = _.memoize(value =>
  globals.disableThoughtHashing ? value : flow([
    lower,
    trim,
    strip,
    pluralize.singular,
    murmurHash3.x64.hash128,
  ])(value)
)
