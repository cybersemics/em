import emojiStrip from 'emoji-strip'
import * as pluralize from 'pluralize'
import * as flow from 'lodash.flow'
import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals.js'

// util
/** Generate a hash of a thought with the following transformations:
  - case-insensitive
  - ignore punctuation & whitespace (when there is other text)
  - ignore emojis (when there is other text)
  - singularize
  - murmurhash to prevent large keys (Firebase limitation)
*/
// stored keys MUST match the current hashing algorithm
// use schemaVersion to manage migrations
export const hashThought = key =>
  globals.disableThoughtHashing ? key : flow([
    key => key.toLowerCase(),
    key => key.replace(
      key.length > 0 && key.replace(/\W/g, '').length > 0 ? /\W/g : /s/g,
      ''
    ),
    emojiStrip(key).length > 0 ? emojiStrip : x => x,
    pluralize.singular,
    murmurHash3.x64.hash128,
  ])(key)
