import { lower } from './lower'
import { Child } from '../types'
import { ComparatorFunction, ComparatorValue } from '../utilTypes'

const regexPunctuation = /^[!@#$%^&*()\-_=+[\]{};:'"<>.,?\\/].*/
const regexEmojis = /([#0-9]\u20E3)|[\xA9\xAE\u203C\u2047-\u2049\u2122\u2139\u3030\u303D\u3297\u3299][\uFE00-\uFEFF]?|[\u2190-\u21FF][\uFE00-\uFEFF]?|[\u2300-\u23FF][\uFE00-\uFEFF]?|[\u2460-\u24FF][\uFE00-\uFEFF]?|[\u25A0-\u25FF][\uFE00-\uFEFF]?|[\u2600-\u27BF][\uFE00-\uFEFF]?|[\u2900-\u297F][\uFE00-\uFEFF]?|[\u2B00-\u2BF0][\uFE00-\uFEFF]?|(?:\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDEFF])[\uFE00-\uFEFF]?|[\u20E3]|[\u26A0-\u3000]|\uD83E[\udd00-\uddff]|[\u00A0-\u269F]/

/** Remove emojis and trailing/leading spaces from camparator inputs using regex. */
const removeEmojisAndSpaces = (str: string) => str.replace(regexEmojis, '').trim()

/** The default comparator that can be used in sort. */
export const compare = (a: any, b: any): ComparatorValue => a > b ? 1 : a < b ? -1 : 0

/** A comparator that sorts emojis above non-emojis. */
export const compareStringsWithEmoji = (a: string, b: string) => {
  const aStartsWithEmoji = regexEmojis.test(a)
  const bStartsWithEmoji = regexEmojis.test(b)
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
export const compareNumberAndOther = (a: any, b: any): ComparatorValue => {
  const aIsNum = !isNaN(a)
  const bIsNum = !isNaN(b)
  return aIsNum && !bIsNum ? -1
    : bIsNum && !aIsNum ? 1
    : 0
}

/** A comparator that sorts numbers in numeric order. */
export const compareNumbers = (a: number, b: number): ComparatorValue => {
  const aIsNum = !isNaN(a)
  const bIsNum = !isNaN(b)
  return aIsNum && bIsNum ? compare(+a, +b)
    : 0
}

/** A case-insensitive lexicographic comparator. */
export const compareLowercase = (a: string, b: string): ComparatorValue => compare(lower(a), lower(b))

/** A comparator function that sorts strings that start with punctuation above others. */
export const comparePunctuationAndOther = (a: string, b: string): ComparatorValue => {
  const aIsPunctuation = regexPunctuation.test(a)
  const bIsPunctuation = regexPunctuation.test(b)
  return aIsPunctuation && !bIsPunctuation ? -1
    : bIsPunctuation && !aIsPunctuation ? 1
    : 0
}

/** A comparison function that sorts date strings. */
export const compareDateStrings = (a: string, b: string): ComparatorValue => {
  return compare(Date.parse(a), Date.parse(b))
}

/** A comparator function that sorts date strings above others. */
const compareDateAndOther = (a: string, b: string): ComparatorValue => {
  const aIsDate = !isNaN(Date.parse(a))
  const bIsDate = !isNaN(Date.parse(b))
  return aIsDate && !bIsDate ? -1
    : bIsDate && !aIsDate ? 1
    : 0
}

/** Creates a composite comparator consisting of each of the given comparators checked in order. */
export const makeOrderedComparator = (comparators: ComparatorFunction<any>[]): ComparatorFunction<any> =>
  (a: any, b: any) =>
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
const compareReasonableText = makeOrderedComparator([
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
export const compareReasonable = makeOrderedComparator([
  compareEmpty,
  comparePunctuationAndOther,
  compareStringsWithEmoji,
  (a, b) => compareReasonableText(removeEmojisAndSpaces(a), removeEmojisAndSpaces(b)),
])

/** Compare the value of two thoughts. */
export const compareThought = (a: Child, b: Child) => compareReasonable(a.value, b.value)
