import flow from 'lodash.flow'
import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals.js'

// util
import {
  getComparisonToken,
} from '../util.js'

/** Generate a hash of a thought with the following transformations:
  - case-insensitive
  - ignore punctuation & whitespace (when there is other text)
  - ignore emojis (when there is other text)
  - singularize
  - murmurhash to prevent large keys (Firebase limitation)
*/
// stored keys MUST match the current hashing algorithm
// use schemaVersion to manage migrations
export const hashThought = value =>
  globals.disableThoughtHashing ? value : flow([
    getComparisonToken,
    murmurHash3.x64.hash128,
  ])(value)
