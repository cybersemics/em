import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals'
import emojiStrip from 'emoji-strip'
import * as pluralize from 'pluralize'
import _ from 'lodash'

/** Matches all HTML tags. */
const regexpTags = /(<([^>]+)>)/ig

/** Converts a string to lowecase. */
const lower = s => s.toLowerCase()

/** Trims a string. */
const trim = s => s.replace(
  s.length > 0 && s.replace(/\W/g, '').length > 0 ? /\W/g : /s/g,
  ''
)

/** Strips emoji from text. Preserves emoji on its own. */
const stripEmojiWithText = s => {
  const stripped = emojiStrip(s)
  return stripped.length > 0 ? stripped : s
}

/** Strips all html tags. */
const stripTags = s => s.replace(regexpTags, '')

/**
 * Making character 's' will just become an empty value ''.
 * Skip it else it will cause "s" character to have same no of context as empty thoughts in the entire tree. */
const singularize = s => s !== 's' ? pluralize.singular(s) : s

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
export const hashThought = _.memoize(value =>
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
