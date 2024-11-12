import emojiStrip from 'emoji-strip'
import _ from 'lodash'
import pluralize from 'pluralize'
import { REGEX_TAGS } from '../constants'

/**
 * Removes whitespace from a value (removes non-word character).
 * Preserves metaprogramming attribute character `=`.
 */
export const removeWhitespace = s => {
  const modifiedString = s[0] === '=' ? s.slice(1) : s
  const replaced = modifiedString.replace(
    modifiedString.length > 0 && modifiedString.replace(/\W/g, '').length > 0 ? /\W/g : /s/g,
    '',
  )
  return s !== modifiedString ? '=' + replaced : replaced
}

/** Strips emoji from text. Preserves emoji on its own. */
const stripEmojiFromText = s => {
  const stripped = emojiStrip(s)
  return stripped.length > 0 ? stripped : s
}

/** Strips all html tags. */
const stripTags = s => s.replace(REGEX_TAGS, '')

/**
 * Making character 's' will just become an empty value ''.
 * Skip it else it will cause "s" character to have same no of context as empty thoughts in the entire tree. */
const singularize = s => (s !== 's' ? pluralize.singular(s) : s)

/** Converts a string to lowecase. */
const lower = s => s.toLowerCase()

/**
 * Converts a thought value into a canonical form that is stored in Lexeme.lemma. Not idempotent (singularize may return a different string after whitespace is removed).
 *
 * - case-insensitive
 * - ignore punctuation & whitespace (when there is other text)
 * - ignore emojis (when there is other text)
 * - singularize.
 */
const normalizeThought = _.memoize(
  _.flow([
    // placed before stripEmojiWithText because stripEmojiWithText partially removes angle brackets
    stripTags,
    lower,
    removeWhitespace,
    stripEmojiFromText,
    singularize,
  ]),
)

export default normalizeThought
