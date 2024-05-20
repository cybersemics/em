import _ from 'lodash'
import ComparatorFunction from '../@types/ComparatorFunction'
import ComparatorValue from '../@types/ComparatorValue'
import Thought from '../@types/Thought'
import { EMOJI_REGEX, REGEX_EMOJI_GLOBAL } from '../constants'
import isAttribute from './isAttribute'
import lower from './lower'

const STARTS_WITH_EMOJI_REGEX = new RegExp(`^${EMOJI_REGEX.source}`)
const IGNORED_PREFIXES = ['the ']
const CURRENT_YEAR = new Date().getFullYear()

const REGEX_PUNCTUATION = /^[!@#$%^&*()\-_=+[\]{};:'"<>.,?\\/].*/
const REGEX_SHORT_DATE_WITH_DASH = /\d{1,2}-\d{1,2}/
const REGEX_SHORT_DATE_WITH_SLASH = /\d{1,2}\/\d{1,2}/
const REGEX_IGNORED_PREFIXES = new RegExp(`^(${IGNORED_PREFIXES.join('|')})(.*)`, 'gmi')
const REGEX_FORMATTING = /^<([b|i|u]|strike)[^>]*>(.*?)<\s*\/\s*([b|i|u]|strike)>/

// removeDiacritics borrowed from modern-diacritics package
// modern-diacritics does not currently import so it is copied here
// See: https://github.com/Mitsunee/modern-diacritics/blob/master/src/removeDiacritics.ts
/** Remove all diacritics from a string. */
const removeDiacritics = (s: string): string => {
  const subject = `${s}`.normalize('NFD')
  let result

  try {
    // more complete modern variant
    result = subject.replace(/\p{Diacritic}/gu, '')
  } catch {
    // backwards compatible variant
    result = subject.replace(/[\u0300-\u036f]/g, '')
  }

  return result
}

/** Remove emojis and trailing/leading spaces from camparator inputs using regex. */
const removeEmojisAndSpaces = (s: string) => s.replace(REGEX_EMOJI_GLOBAL, '').trim()

/** Remove ignored prefixes from comparator inputs. */
const removeIgnoredPrefixes = (s: string) => s.replace(REGEX_IGNORED_PREFIXES, '$2')

/** Removes emojis, spaces, and prefix 'the' to make a string comparable.  */
const normalizeCharacters = _.flow(removeEmojisAndSpaces, removeIgnoredPrefixes, removeDiacritics)

/** Parse a date string and handle M/d (e.g. "2/1") for Safari. */
const parseDate = (s: string): number =>
  Date.parse(
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    REGEX_SHORT_DATE_WITH_DASH.test(s)
      ? `${s}-${CURRENT_YEAR}`
      : // eslint-disable-next-line @typescript-eslint/no-extra-parens
        REGEX_SHORT_DATE_WITH_SLASH.test(s)
        ? `${s}/${CURRENT_YEAR}`
        : s,
  )

/** Returns trure if the given string is an integer or decimal number. Recognizes prefixed number strings like "#1" and "$1" as numbers. */
const isNumber = (x: number | string): boolean => !isNaN(toNumber(x))

/** Converts a string to a number. If given a number, returns it as-is. If given a string with a prefixe such as "#" or "$", strips it and returns the actual number. If given a number range, returns the start of the range. If the input cannot be converted to a number, returns NaN. */
const toNumber = (x: number | string): number =>
  // match hyphen, em-dash, and em-dash
  typeof x === 'number' ? x : +x.replace(/^[$₹₤₱₠₪₨€#] ?/, '').replace(/^(\d+)\s*[-–—]\s*\d+$/, '$1')

/** The default comparator that uses the ">" operator. Can be passed to Array.prototype.sort. */
export const compare = <T>(a: T, b: T) => (a > b ? 1 : a < b ? -1 : 0)

/** A comparator that sorts emojis above non-emojis. */
export const compareStringsWithEmoji: ComparatorFunction<string> = (a: string, b: string) => {
  const aStartsWithEmoji = !!a.match(STARTS_WITH_EMOJI_REGEX)
  const bStartsWithEmoji = !!b.match(STARTS_WITH_EMOJI_REGEX)
  return aStartsWithEmoji && !bStartsWithEmoji ? -1 : bStartsWithEmoji && !aStartsWithEmoji ? 1 : 0
}

/** A comparator that sorts meta-attributes above everything. */
export const compareStringsWithMetaAttributes: ComparatorFunction<string> = (a: string, b: string) => {
  const aIsMetaAttribute = isAttribute(a)
  const bIsMetaAttribute = isAttribute(b)
  return aIsMetaAttribute && !bIsMetaAttribute ? -1 : bIsMetaAttribute && !aIsMetaAttribute ? 1 : 0
}

/** A comparator that sorts empty thoughts ahead of non-empty thoughts. */
export const compareEmpty: ComparatorFunction<string> = (a: string, b: string) => {
  const aIsEmpty = a === ''
  const bIsEmpty = b === ''
  return aIsEmpty && !bIsEmpty ? -1 : bIsEmpty && !aIsEmpty ? 1 : 0
}

/** A comparator that sorts numbers ahead of non-numbers. */
export const compareNumberAndOther: ComparatorFunction<number | string> = (a: number | string, b: number | string) => {
  const aIsNum = isNumber(a)
  const bIsNum = isNumber(b)
  return aIsNum && !bIsNum ? -1 : bIsNum && !aIsNum ? 1 : 0
}

/** A comparator that sorts numbers in numeric order. */
export const compareNumbers: ComparatorFunction<number | string> = (
  a: number | string,
  b: number | string,
): ComparatorValue => {
  const aIsNum = isNumber(a)
  const bIsNum = isNumber(b)
  return aIsNum && bIsNum ? compare(toNumber(a), toNumber(b)) : 0
}

/** A case-insensitive lexicographic comparator. */
export const compareLowercase: ComparatorFunction<string> = (a: string, b: string) => compare(lower(a), lower(b))

/** A comparator function that sorts strings that start with punctuation above others. */
export const comparePunctuationAndOther = <T, U>(a: T, b: U): ComparatorValue => {
  const aIsPunctuation = typeof a === 'string' && REGEX_PUNCTUATION.test(a)
  const bIsPunctuation = typeof b === 'string' && REGEX_PUNCTUATION.test(b)
  return aIsPunctuation && !bIsPunctuation ? -1 : bIsPunctuation && !aIsPunctuation ? 1 : 0
}

/** A comparator function that sorts strings that contain HTML formatting above others. */
export const compareFormatting = <T, U>(a: T, b: U): ComparatorValue => {
  const aIsHtml = typeof a === 'string' && REGEX_FORMATTING.test(a)
  const bIsHtml = typeof b === 'string' && REGEX_FORMATTING.test(b)
  return aIsHtml && !bIsHtml ? -1 : bIsHtml && !aIsHtml ? 1 : 0
}

/** A comparison function that sorts date strings. */
export const compareDateStrings: ComparatorFunction<string> = (a: string, b: string) =>
  compare(parseDate(a), parseDate(b))

/** A comparator function that sorts date strings above others. */
const compareDateAndOther: ComparatorFunction<string> = (a: string, b: string) => {
  const aIsDate = !isNaN(parseDate(a))
  const bIsDate = !isNaN(parseDate(b))
  return aIsDate && !bIsDate ? -1 : bIsDate && !aIsDate ? 1 : 0
}

/** Creates a composite comparator consisting of each of the given comparators checked in order. */
export const makeOrderedComparator =
  <T>(comparators: ComparatorFunction<T>[]): ComparatorFunction<T> =>
  (a: T, b: T) =>
    comparators.length === 0
      ? // base case
        0
      : // if the values are non equal by the initial comparator, return the result of the comparator
        comparators[0](a, b) ||
        // if they are equal, move on to the next comparator
        makeOrderedComparator(comparators.slice(1))(a, b) // RECURSION

// eslint-disable-next-line jsdoc/require-description-complete-sentence
/** A comparator that sorts basic text.
 * 1. Numbers (8, 9, 10; #8, #9, #10).
 * 2. Dates (9/1, 10/1, 11/1).
 * 3. Lexicographic (default).
 */
const compareReadableText: ComparatorFunction<string> = makeOrderedComparator<string>([
  compareNumberAndOther,
  compareNumbers,
  compareDateAndOther,
  compareDateStrings,
  compareLowercase,
])

// eslint-disable-next-line jsdoc/require-description-complete-sentence
/** A comparator that compares by reasonable, human-readable value:
 * 1. Empty.
 * 2. Punctuation (=, +, #hi, =test).
 * 3. Emoji.
 * 4. CompareReadableText on text without emoji.
 */
export const compareReasonable: ComparatorFunction<string> = makeOrderedComparator<string>([
  compareEmpty,
  comparePunctuationAndOther,
  compareFormatting,
  compareStringsWithMetaAttributes,
  compareStringsWithEmoji,
  (a, b) => compareReadableText(normalizeCharacters(a), normalizeCharacters(b)),
])

/** Get reverse of the given comparator. */
const reverse =
  <T>(comparator: ComparatorFunction<T>): ComparatorFunction<T> =>
  (a: T, b: T) =>
    comparator(b, a)

/** Compare the value of two thoughts. If the thought has a sortValue, it takes precedence over value. This preserves the sort order of a thought edited to empty instead of moving it to the top of thi list. */
export const compareThought: ComparatorFunction<Thought> = (a: Thought, b: Thought) =>
  compareReasonable(a.sortValue || a.value, b.sortValue || b.value)

/** A comparator that sorts in descending order. */
export const compareThoughtDescending = reverse(compareThought)
