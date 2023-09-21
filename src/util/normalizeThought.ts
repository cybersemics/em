import emojiStrip from 'emoji-strip'
import _ from 'lodash'
import * as pluralize from 'pluralize'
import { REGEXP_TAGS } from '../constants'

/** Removes whitespace from a value (removes non-word character). */
const removeWhitespace = (s: string) => s.replace(/\s/g, '')

/** Removes all punctuation (except hyphens, which are selectively removed by removeHyphens. */
// [-–—] is a character class that matches hyphens and dashes.
// Use unicode character class escape.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape
const removePunctuation = (s: string) => {
  const stripped = s.replace(/(?![-–—/:&|!#@])[\p{P}$+<>^`|~]/gu, '')
  return stripped.length > 0 ? stripped : s
}

/** Removes punctuation from the end of words. */
const removePunctuationEnding = (s: string) => {
  const stripped = s.replace(/[:;!?](?=\s|$)/g, '')
  return stripped.length > 0 ? stripped : s
}

/** Removes hyphens and dashes in the middle of a word, unless it is a number range. */
const removeHyphens = (s: string) => s.replace(/\b[-–—/]\b(?![0-9])/g, '')

/** Change ampersand to 'and'. */
const transformAmpersand = (s: string) => s.replace(/&/g, 'and')

/** Strips emoji from text. Preserves emoji on its own. */
const stripEmojiFromText = (s: string) => {
  const stripped = emojiStrip(s)
  return stripped.length > 0 ? stripped : s
}

/** Strips all html tags. */
const stripTags = (s: string) => s.replace(REGEXP_TAGS, '')

/**
 * Making character 's' will just become an empty value ''.
 * Skip it else it will cause "s" character to have same no of context as empty thoughts in the entire tree. */
const singularize = (s: string) => (s !== 's' ? pluralize.singular(s) : s)

/** Converts a string to lowecase. */
const lower = (s: string) => s.toLowerCase()

/**
 * Converts a thought value into a canonical form that is stored in Lexeme.lemma.
 * Not idempotent (singularize may return a different string after whitespace is removed).
 */
const normalizeThought = _.memoize(
  _.flow([
    // stripTags must be placed before stripEmojiWithText because stripEmojiWithText partially removes angle brackets
    stripTags,
    lower,
    removeWhitespace,
    removePunctuation,
    removeHyphens,
    removePunctuationEnding,
    transformAmpersand,
    stripEmojiFromText,
    singularize,
  ]) as (s: string) => string,
)

export default normalizeThought
