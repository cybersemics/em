import moize from 'moize'
import * as murmurHash3 from 'murmurhash3js'
import ThoughtHash from '../@types/ThoughtHash'
import globals from '../globals'
import normalizeThought from './normalizeThought'

// eslint-disable-next-line jsdoc/require-description-complete-sentence
/**
 * Generate a hash of a thought with the following transformations.
 *
 * - case-insensitive.
 * - ignore punctuation & whitespace (when there is other text).
 * - ignore emojis (when there is other text).
 * - singularize.
 * - murmurhash.
 *
 * Stored keys MUST match the current hashing algorithm.
 * Use schemaVersion to manage migrations.
 */
const hashThought: (s: string) => ThoughtHash = globals.debugIds
  ? (value: string) => value as ThoughtHash
  : moize((value: string) => murmurHash3.x64.hash128(normalizeThought(value)) as ThoughtHash, { maxSize: 1000 })

export default hashThought
