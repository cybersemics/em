import { lower } from './lower'
import { Child, ComparatorFunction, ComparatorValue } from '../types'
import { EMOJI_REGEX } from '../constants'

const regexPunctuation = /^[!@#$%^&*()\-_=+[\]{};:'"<>.,?\\/].*/
const regexShortDateWithDash = /\d{1,2}-\d{1,2}/
const regexShortDateWithSlash = /\d{1,2}\/\d{1,2}/

/** Remove emojis and trailing/leading spaces from camparator inputs using regex. */
const removeEmojisAndSpaces = (str: string) => str.replace(EMOJI_REGEX, '').trim()

/** Parse a date string and handle M/d (e.g. "2/1") for Safari. */
const parseDate = (s: string) =>
  Date.parse(
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    regexShortDateWithDash.test(s) ? `${s}-${(new Date()).getFullYear()}`
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    : regexShortDateWithSlash.test(s) ? `${s}/${(new Date()).getFullYear()}`
    : s
  )

/** The default comparator that can be used in sort. */
export const compare = <T>(a: T, b: T): ComparatorValue => a > b ? 1 : a < b ? -1 : 0

/** A comparator that sorts emojis above non-emojis. */
export const compareStringsWithEmoji = (a: string, b: string) => {
  const aStartsWithEmoji = EMOJI_REGEX.test(a)
  const bStartsWithEmoji = EMOJI_REGEX.test(b)
  return aStartsWithEmoji && !bStartsWithEmoji ? -1
    : bStartsWithEmoji && !aStartsWithEmoji ? 1
    : 0
}

/** A comparator that sorts empty thoughts ahead of non-empty thoughts. */
export const compareEmpty = (a: string, b: string): ComparatorValue => {
  const aIsEmpty = a === ''
  const bIsEmpty = b === ''
  return aIsEmpty && !bIsEmpty ? -1
    : bIsEmpty && !aIsEmpty ? 1
    : 0
}

/** A comparator that sorts numbers ahead of non-numbers. */
export const compareNumberAndOther = <T, U>(a: T, b: U): ComparatorValue => {
  const aIsNum = !isNaN(+a)
  const bIsNum = !isNaN(+b)
  return aIsNum && !bIsNum ? -1
    : bIsNum && !aIsNum ? 1
    : 0
}

/** A comparator that sorts numbers in numeric order. */
export const compareNumbers = <T, U>(a: T, b: U): ComparatorValue => {
  const aIsNum = !isNaN(+a)
  const bIsNum = !isNaN(+b)
  return aIsNum && bIsNum ? compare(+a, +b)
    : 0
}

/** A case-insensitive lexicographic comparator. */
export const compareLowercase = (a: string, b: string): ComparatorValue => compare(lower(a), lower(b))

/** A comparator function that sorts strings that start with punctuation above others. */
export const comparePunctuationAndOther = <T, U>(a: T, b: U): ComparatorValue => {
  const aIsPunctuation = typeof a === 'string' && regexPunctuation.test(a)
  const bIsPunctuation = typeof b === 'string' && regexPunctuation.test(b)
  return aIsPunctuation && !bIsPunctuation ? -1
    : bIsPunctuation && !aIsPunctuation ? 1
    : 0
}

/** A comparison function that sorts date strings. */
export const compareDateStrings = (a: string, b: string): ComparatorValue => {
  return compare(parseDate(a), parseDate(b))
}

/** A comparator function that sorts date strings above others. */
const compareDateAndOther = (a: string, b: string): ComparatorValue => {
  const aIsDate = !isNaN(parseDate(a))
  const bIsDate = !isNaN(parseDate(b))
  return aIsDate && !bIsDate ? -1
    : bIsDate && !aIsDate ? 1
    : 0
}

/** Creates a composite comparator consisting of each of the given comparators checked in order. */
export const makeOrderedComparator = <T>(comparators: ComparatorFunction<T>[]): ComparatorFunction<T> =>
  (a: T, b: T) =>
    comparators.length === 0
      // base case
      ? 0
      // if the values are non equal by the initial comparator, return the result of the comparator
      : comparators[0](a, b) ||
        // if they are equal, move on to the next comparator
        makeOrderedComparator(comparators.slice(1))(a, b) // RECURSION

// eslint-disable-next-line jsdoc/require-description-complete-sentence
/** A comparator that sorts basic text.
 * 1. numbers (8, 9, 10)
 * 2. dates (9/1, 10/1, 11/1)
 * 3. lexicographic (default)
 */
const compareReasonableText = makeOrderedComparator<string>([
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
 * 4. compareReasonableText on text without emoji
 */
export const compareReasonable = makeOrderedComparator<string>([
  compareEmpty,
  comparePunctuationAndOther,
  compareStringsWithEmoji,
  (a, b) => compareReasonableText(removeEmojisAndSpaces(a), removeEmojisAndSpaces(b)),
])

/** Compare the value of two thoughts. */
export const compareThought = (a: Child, b: Child) => compareReasonable(a.value, b.value)
