const _ = require('lodash')
const pluralize = require('pluralize')
const emojiStrip = require('emoji-strip')
const REGEXP_TAGS = /(<([^>]+)>)/gi

/** Trims a string. */
const trim = s => s.replace(s.length > 0 && s.replace(/\W/g, '').length > 0 ? /\W/g : /s/g, '')

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
 * Tranformations for thought value:
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
    trim,
    stripEmojiFromText,
    singularize,
  ]),
)

module.exports = normalizeThought
