import * as murmurHash3 from 'murmurhash3js'
import _ from 'lodash'
import globals from '../globals'
import { stripTags } from './stripTags'
import { stripEmojiWithText } from './stripEmojiWithText'
import { singularize } from './singularize'
import { trim } from './trim'

/** Converts a string to lowecase. */
const lower = (s: string) => s.toLowerCase()

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
export const hashThought = _.memoize((value: string) =>
  globals.disableThoughtHashing ? value : _.flow([
    // placed before stripEmojiWithText because stripEmojiWithText partially removes angle brackets
    stripTags,
    lower,
    trim,
    stripEmojiWithText,
    singularize,
    murmurHash3.x64.hash128,
  ])(value)
)
