import * as murmurHash3 from 'murmurhash3js'
import _ from 'lodash'
import globals from '../globals'
import { ThoughtHash } from '../types'
import { normalizeThought } from './normalizeThought'

// eslint-disable-next-line jsdoc/require-description-complete-sentence
/**
 * Generate a hash of a thought with the following transformations:
 *
 * - case-insensitive
 * - ignore punctuation & whitespace (when there is other text)
 * - ignore emojis (when there is other text)
 * - singularize
 * - murmurhash to prevent large keys (Firebase limitation)
 *
 * Stored keys MUST match the current hashing algorithm.
 * Use schemaVersion to manage migrations.
 */
export const hashThought: (s: string) => ThoughtHash = _.memoize(
  (value: string) => _.flow([
    normalizeThought,
    ...globals.disableThoughtHashing ? [] : [murmurHash3.x64.hash128],
  ])(value)
)
