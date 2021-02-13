import _ from 'lodash'
import { singularize } from './singularize'
import { stripTags } from './stripTags'
import { trim } from './trim'
import { stripEmojiFromText } from './stripEmojiFromText'

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
