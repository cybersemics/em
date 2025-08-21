/* eslint-disable import/prefer-default-export */
import _ from 'lodash'
import ComparatorFunction from '../@types/ComparatorFunction'
import ComparatorValue from '../@types/ComparatorValue'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { ALLOWED_FORMATTING_TAGS, EMOJI_REGEX, REGEX_EMOJI_GLOBAL } from '../constants'
import thoughtToPath from '../selectors/thoughtToPath'
import compareByRank from './compareByRank'
import isAttribute from './isAttribute'
import lower from './lower'
import noteValue from './noteValue'

const STARTS_WITH_EMOJI_REGEX = new RegExp(`^${EMOJI_REGEX.source}`)
const IGNORED_PREFIXES = ['the ']
const CURRENT_YEAR = new Date().getFullYear()

const REGEX_PUNCTUATION = /^[!@#$%^&*()\-_=+[\]{};:'"<>.,?\\/].*/
const REGEX_IGNORED_PREFIXES = new RegExp(`^(${IGNORED_PREFIXES.join('|')})(.*)`, 'gmi')
const REGEX_FORMATTING = new RegExp(
  `^<(${ALLOWED_FORMATTING_TAGS.join('|')})[^>]*>(.*?)<\\s*/\\s*(${ALLOWED_FORMATTING_TAGS.join('|')})>`,
)

// Date pattern regex constants for performance optimization
// Month names for reuse across date patterns (pipe-separated for regex)
const MONTH_NAMES = 'January|February|March|April|May|June|July|August|September|October|November|December'

// Combined regex for detecting all valid date formats:
// - M/d or M/d/yy or M/d/yyyy (slash format with optional year)
// - M-d or M-d-yy or M-d-yyyy (dash format with optional year)
// - Month Day or Month Day, yy or Month Day, yyyy (written format with optional year)
// Uses separate patterns to ensure consistent separators (no mixed slashes/dashes)
const REGEX_DATE_COMBINED = new RegExp(
  `^(\\d{1,2}\\/\\d{1,2}(\\/\\d{2,4})?|\\d{1,2}-\\d{1,2}(-\\d{2,4})?|(${MONTH_NAMES})\\s+\\d{1,2}(,\\s*\\d{2,4})?)$`,
  'i',
)

// Pre-compiled regex for parsing short dates (without year) to avoid runtime compilation:
// - M/d or M-d (numeric format without year)
// - Month Day (written format without year)
// Allows mixed separators since it's only for parsing, not validation
const REGEX_SHORT_DATE_PARSE = new RegExp(`^(\\d{1,2}[\\/-]\\d{1,2}|(${MONTH_NAMES})\\s+\\d{1,2})$`, 'i')

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

/** Parse a date string and handle M/d (e.g. "2/1") and written formats (e.g. "March 3") for Safari. */
const parseDate = (s: string): number => {
  // Use pre-compiled regex for optimal performance
  const shortDateMatch = s.match(REGEX_SHORT_DATE_PARSE)

  // Build the complete date string
  const dateString = shortDateMatch ? `${s}${s.includes('/') ? '/' : s.includes('-') ? '-' : ', '}${CURRENT_YEAR}` : s

  // Single Date.parse call for optimal performance
  return Date.parse(dateString)
}
/** Converts a string to a number. If given a number, returns it as-is. If given a string with a prefixe such as "#" or "$", strips it and returns the actual number. If given a number range, returns the start of the range. If the input cannot be converted to a number, returns NaN. */
const toNumber = (x: number | string): number =>
  // match hyphen, em-dash, and em-dash
  typeof x === 'number' ? x : +x.replace(/^[$₹₤₱₠₪₨€#] ?/, '').replace(/^(\d+)\s*[-–—]\s*\d+$/, '$1')

/** Returns trure if the given string is an integer or decimal number. Recognizes prefixed number strings like "#1" and "$1" as numbers. */
const isNumber = (x: number | string): boolean => !isNaN(toNumber(x))

/** Checks if a string matches a date pattern like "M/d", "M-d", "M/d/yy", "M/d/yyyy", "M-d-yy", "M-d-yyyy", or written formats.
 * Accepts 1-2 digits for month and day, optionally followed by 2-4 digit year
 * Also accepts written month names like "March 3, 20" or "December 3, 2020"
 * Requires consistent separators (all slashes or all dashes)
 * Examples: "6/21", "6-21", "12/1", "12-1", "6/21/25", "6/21/2025", "6-21-25", "6-21-2025", "March 3, 20", "December 3, 2020".
 */
export const isDatePattern = (value: string): boolean => {
  // Use single combined pattern for optimal performance
  return REGEX_DATE_COMBINED.test(value)
}

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

/** A comparison function that sorts date strings. Only handles date vs date comparisons. */
export const compareDateStrings: ComparatorFunction<string> = (a: string, b: string) => {
  const aTrimmed = a.trim()
  const bTrimmed = b.trim()

  const aIsDate = isDatePattern(aTrimmed)
  const bIsDate = isDatePattern(bTrimmed)

  // Only compare if both are valid dates
  if (aIsDate && bIsDate) {
    return compare(parseDate(aTrimmed), parseDate(bTrimmed))
  }

  // Let other comparators handle non-date comparisons
  return 0
}

/** A comparator function that sorts date strings above others. */
const compareDateAndOther: ComparatorFunction<string> = (a: string, b: string) => {
  const aIsDate = isDatePattern(a.trim())
  const bIsDate = isDatePattern(b.trim())
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

/** A comparator that sorts human-readable text in natural ascending order. Handles letters, numbers, and dates.
 * 1. Numbers (8, 9, 10; #8, #9, #10).
 * 2. Dates (9/1, 10/1, 11/1).
 * 3. Lexicographic (default).
 */
const compareReadableText: ComparatorFunction<string> = makeOrderedComparator<string>([
  compareDateAndOther,
  compareDateStrings,
  compareNumberAndOther,
  compareNumbers,
  compareLowercase,
])

/** A comparator that sorts nearly anything in ascending order.
 * 1. Empty string.
 * 2. Punctuation (=, +, #hi, =test).
 * 3. Formatting (b, i, u, em, strong, span, strike, code, font).
 * 4. Meta attributes.
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

/** A comparator that sorts anything in descending order. Not a strict reversal of compareReasonable, as empty strings, formatting, punctuation, and meta attributes are still sorted above plain text.
 * 1. Empty string.
 * 2. Punctuation (=, +, #hi, =test).
 * 3. Formatting (b, i, u, em, strong, span, strike, code, font).
 * 4. Meta attributes.
 * 3. Emoji.
 * 4. CompareReadableText on text without emoji.
 */
export const compareReasonableDescending: ComparatorFunction<string> = makeOrderedComparator<string>([
  compareFormatting,
  compareEmpty,
  _.flip(comparePunctuationAndOther),
  _.flip(compareStringsWithMetaAttributes),
  _.flip(compareStringsWithEmoji),
  (a, b) => compareReadableText(normalizeCharacters(b), normalizeCharacters(a)),
])

/** Compare the value of two thoughts. */
export const compareThought: ComparatorFunction<Thought> = (a: Thought, b: Thought) =>
  compareReasonable(a.value, b.value)

/** A comparator that sorts in descending order, with formatted text prioritized first. */
export const compareThoughtDescending: ComparatorFunction<Thought> = (a: Thought, b: Thought) =>
  compareReasonableDescending(a.value, b.value)

/** Compare two thoughts by their created timestamp in ascending order (oldest first). Fall back to compareReasonable if created at thn same time. */
export const compareThoughtByCreated: ComparatorFunction<Thought> = (a: Thought, b: Thought) =>
  compare(a.created, b.created) || compareReasonable(a.value, b.value)

/** Compare two thoughts by their created timestamp in descending order (newest first). Fall back to compareReasonable if created at the same time. */
export const compareThoughtByCreatedDescending: ComparatorFunction<Thought> = (a: Thought, b: Thought) =>
  compare(b.created, a.created) || compareReasonable(a.value, b.value)

/** Compare two thoughts by their lastUpdated timestamp in ascending order (oldest first). Fall back to compareReasonable if created at the same time. */
export const compareThoughtByUpdated: ComparatorFunction<Thought> = (a: Thought, b: Thought) =>
  compare(a.lastUpdated, b.lastUpdated) || compareReasonable(a.value, b.value)

/** Compare two thoughts by their lastUpdated timestamp in descending order (newest first). Fall back to compareReasonable if created at the same time. */
export const compareThoughtByUpdatedDescending: ComparatorFunction<Thought> = (a: Thought, b: Thought) =>
  compare(b.lastUpdated, a.lastUpdated) || compareReasonable(a.value, b.value)

/** Makes a comparator function that compares two thoughts by their note value. */
const makeCompareThoughtByNote =
  (state: State): ComparatorFunction<Thought> =>
  (a: Thought, b: Thought) => {
    const noteA = noteValue(state, thoughtToPath(state, a.id)) ?? '\0'
    const noteB = noteValue(state, thoughtToPath(state, b.id)) ?? '\0'
    return compareReasonable(noteA, noteB)
  }

/** Makes a comparator function that compares two thoughts by their note value. */
const makeCompareThoughtNoteAndOther =
  (state: State): ComparatorFunction<Thought> =>
  (a: Thought, b: Thought) => {
    const aHasNote = noteValue(state, thoughtToPath(state, a.id)) !== null
    const bHasNote = noteValue(state, thoughtToPath(state, b.id)) !== null
    return aHasNote && !bHasNote ? -1 : bHasNote && !aHasNote ? 1 : 0
  }

/** Compare two thoughts by their note value in ascending order, falling back to their rank if notes are absent or equal. */
export const compareThoughtByNoteAndRank = (state: State): ComparatorFunction<Thought> =>
  makeOrderedComparator([makeCompareThoughtNoteAndOther(state), makeCompareThoughtByNote(state), compareByRank])

/** Compare two thoughts by their note value in descending order, falling back to their rank if notes are absent or equal. */
export const compareThoughtByNoteDescendingAndRank = (state: State): ComparatorFunction<Thought> =>
  makeOrderedComparator([makeCompareThoughtNoteAndOther(state), _.flip(makeCompareThoughtByNote(state)), compareByRank])
