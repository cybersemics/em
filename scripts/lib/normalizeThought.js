import emojiStrip from 'emoji-strip'
import _ from 'lodash'
import pluralize from 'pluralize'

const REGEXP_TAGS = /(<([^>]+)>)/gi

/** Removes whitespace from a string. Allows "racecar" to match "race car". */
const removeWhitespace = s => s.replace(s.length > 0 && s.replace(/\W/g, '').length > 0 ? /\W/g : /s/g, '')

/** Strips emoji from text. Preserves emoji on its own. */
const stripEmojiFromText = s => {
  const stripped = emojiStrip(s)
  return stripped.length > 0 ? stripped : s
}

/** Strips all html tags. */
const stripTags = s => {
  return s.replace(REGEXP_TAGS, '')
}

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
