import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals.js'
import emojiStrip from 'emoji-strip'
import * as pluralize from 'pluralize'
import _ from 'lodash'

import { ID } from '../constants'

const SEPARATOR_TOKEN = '__SEP__'

const lower = (s: string) => s.toLowerCase()
const trim = (s: string) => s.replace(
  s.length > 0 && s.replace(/\W/g, '').length > 0 ? /\W/g : /s/g,
  ''
)
const strip = (s: string) => {
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
export const hashThought = _.memoize((value: string, rank?: number) =>

  globals.disableThoughtHashing ? value : _.flow([
    lower,
    trim,
    strip,
    pluralize.singular,
    // hash rank if defined
    rank != null ? s => s + SEPARATOR_TOKEN + rank : ID,
    murmurHash3.x64.hash128,
  ])(value),

// custom memoize resolver to cache on both arguments
(value, rank?) => rank != null
  ? value + SEPARATOR_TOKEN + rank
  : value
)
