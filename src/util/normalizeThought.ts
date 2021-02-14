import _ from 'lodash'
import * as pluralize from 'pluralize'
import { REGEXP_TAGS } from '../constants'
import emojiStrip from 'emoji-strip'

/** Trims a string. */
export const trim = (s: string) => s.replace(
  s.length > 0 && s.replace(/\W/g, '').length > 0 ? /\W/g : /s/g,
  ''
)

/** Strips emoji from text. Preserves emoji on its own. */
export const stripEmojiFromText = (s: string) => {
  const stripped = emojiStrip(s)
  return stripped.length > 0 ? stripped : s
}

/** Strips all html tags. */
export const stripTags = (s: string) => s.replace(REGEXP_TAGS, '')

/**
 * Making character 's' will just become an empty value ''.
 * Skip it else it will cause "s" character to have same no of context as empty thoughts in the entire tree. */
export const singularize = (s: string) => s !== 's' ? pluralize.singular(s) : s

/** Converts a string to lowecase. */
const lower = (s: string) => s.toLowerCase()

/**
 * Tranformations for thought value:
 *
 * - case-insensitive
 * - ignore punctuation & whitespace (when there is other text)
 * - ignore emojis (when there is other text)
 * - singularize.
 */
export const normalizeThought = _.flow([
  // placed before stripEmojiWithText because stripEmojiWithText partially removes angle brackets
  stripTags,
  lower,
  trim,
  stripEmojiFromText,
  singularize,
])
