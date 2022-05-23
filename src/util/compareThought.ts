import { lower } from './lower'
import { ComparatorFunction, ComparatorValue, Thought } from '../@types'
import { EMOJI_REGEX, EMOJI_REGEX_GLOBAL } from '../constants'

const STARTS_WITH_EMOJI_REGEX = new RegExp(`^${EMOJI_REGEX.source}`)
const IGNORED_PREFIXES = ['the ']
const CURRENT_YEAR = new Date().getFullYear()

const regexPunctuation = /^[!@#$%^&*()\-_=+[\]{};:'"<>.,?\\/].*/
const regexShortDateWithDash = /\d{1,2}-\d{1,2}/
const regexShortDateWithSlash = /\d{1,2}\/\d{1,2}/
const regexIgnoredPrefixes = new RegExp(`^(${IGNORED_PREFIXES.join('|')})(.*)`, 'gm')

/** Remove emojis and trailing/leading spaces from camparator inputs using regex. */
const removeEmojisAndSpaces = (str: string) => str.replace(EMOJI_REGEX_GLOBAL, '').trim()

/** Remove ignored prefixes from comparator inputs. */
const removeIgnoredPrefixes = (str: string) => str.replace(regexIgnoredPrefixes, '$2')

/** Removes emojis, spaces, and prefix 'the' to make a string comparable.  */
const removeUncomparableCharacters = (str: string) => {
  return removeIgnoredPrefixes(removeEmojisAndSpaces(str))
}

/** Parse a date string and handle M/d (e.g. "2/1") for Safari. */
const parseDate = (s: string) =>
  Date.parse(
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    regexShortDateWithDash.test(s)
      ? `${s}-${CURRENT_YEAR}`
      : // eslint-disable-next-line @typescript-eslint/no-extra-parens
      regexShortDateWithSlash.test(s)
      ? `${s}/${CURRENT_YEAR}`
      : s,
  )

/** Returns trure if the given string is an integer or decimal number. Recognizes prefixed number strings like "#1" and "$1" as numbers. */
const isNumber = (x: number | string) => !isNaN(toNumber(x))

/** Converts a string to a number. If given a number, returns it as-is. If given a string with a prefixe such as "#" or "$", strips it and returns the actual number. If the input cannot be converted to a number, returns NaN. */
const toNumber = (x: number | string) => (typeof x === 'number' ? x : +x.replace(/^[$₹₤₱₠₪₨€#] ?/, ''))

/** The default comparator that uses the ">" operator. Can be passed to Array.prototype.sort. */
export const compare = <T>(a: T, b: T): ComparatorValue => (a > b ? 1 : a < b ? -1 : 0)

/** A comparator that sorts emojis above non-emojis. */
export const compareStringsWithEmoji = (a: string, b: string) => {
  const aStartsWithEmoji = !!a.match(STARTS_WITH_EMOJI_REGEX)
  const bStartsWithEmoji = !!b.match(STARTS_WITH_EMOJI_REGEX)
  return aStartsWithEmoji && !bStartsWithEmoji ? -1 : bStartsWithEmoji && !aStartsWithEmoji ? 1 : 0
}

/** A comparator that sorts empty thoughts ahead of non-empty thoughts. */
export const compareEmpty = (a: string, b: string): ComparatorValue => {
  const aIsEmpty = a === ''
  const bIsEmpty = b === ''
  return aIsEmpty && !bIsEmpty ? -1 : bIsEmpty && !aIsEmpty ? 1 : 0
}

/** A comparator that sorts numbers ahead of non-numbers. */
export const compareNumberAndOther = (a: number | string, b: number | string): ComparatorValue => {
  const aIsNum = isNumber(a)
  const bIsNum = isNumber(b)
  return aIsNum && !bIsNum ? -1 : bIsNum && !aIsNum ? 1 : 0
}

/** A comparator that sorts numbers in numeric order. */
export const compareNumbers = (a: number | string, b: number | string): ComparatorValue => {
  const aIsNum = isNumber(a)
  const bIsNum = isNumber(b)
  return aIsNum && bIsNum ? compare(toNumber(a), toNumber(b)) : 0
}

/** A case-insensitive lexicographic comparator. */
export const compareLowercase = (a: string, b: string): ComparatorValue => compare(lower(a), lower(b))

/** A comparator function that sorts strings that start with punctuation above others. */
export const comparePunctuationAndOther = <T, U>(a: T, b: U): ComparatorValue => {
  const aIsPunctuation = typeof a === 'string' && regexPunctuation.test(a)
  const bIsPunctuation = typeof b === 'string' && regexPunctuation.test(b)
  return aIsPunctuation && !bIsPunctuation ? -1 : bIsPunctuation && !aIsPunctuation ? 1 : 0
}

/** A comparison function that sorts date strings. */
export const compareDateStrings = (a: string, b: string): ComparatorValue => {
  return compare(parseDate(a), parseDate(b))
}

/** A comparator function that sorts date strings above others. */
const compareDateAndOther = (a: string, b: string): ComparatorValue => {
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
 * 1. numbers (8, 9, 10; #8, #9, #10)
 * 2. dates (9/1, 10/1, 11/1)
 * 3. lexicographic (default)
 */
const compareReadableText = makeOrderedComparator<string>([
  compareNumberAndOther,
  compareNumbers,
  compareDateAndOther,
  compareDateStrings,
  compareLowercase,
])

// eslint-disable-next-line jsdoc/require-description-complete-sentence
/** A comparator that compares by reasonable, human-readable value:
 * 1. empty
 * 2. punctuation (=, +, #hi, =test)
 * 3. emoji
 * 4. compareReadableText on text without emoji
 */
export const compareReasonable = makeOrderedComparator<string>([
  compareEmpty,
  comparePunctuationAndOther,
  compareStringsWithEmoji,
  (a, b) => compareReadableText(removeUncomparableCharacters(a), removeUncomparableCharacters(b)),
])

/** Get reverse of the given comparator. */
const reverse =
  <T>(comparator: ComparatorFunction<T>) =>
  (a: T, b: T) =>
    comparator(b, a)

/** Compare the value of two thoughts. If the thought has a sortValue, it takes precedence over value. This preserves the sort order of a thought edited to empty instead of moving it to the top of thi list. */
export const compareThought = (a: Thought, b: Thought) =>
  compareReasonable(a.sortValue || a.value, b.sortValue || b.value)

/** A comparator that sorts in descending order. */
export const compareThoughtDescending = reverse(compareThought)
