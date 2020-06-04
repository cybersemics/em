import { lower } from './lower'

const regexPunctuation = /^[!@#$%^&*()\-_=+[\]{};:'"<>.,?\\/].*/
const regexEmojis = /([#0-9]\u20E3)|[\xA9\xAE\u203C\u2047-\u2049\u2122\u2139\u3030\u303D\u3297\u3299][\uFE00-\uFEFF]?|[\u2190-\u21FF][\uFE00-\uFEFF]?|[\u2300-\u23FF][\uFE00-\uFEFF]?|[\u2460-\u24FF][\uFE00-\uFEFF]?|[\u25A0-\u25FF][\uFE00-\uFEFF]?|[\u2600-\u27BF][\uFE00-\uFEFF]?|[\u2900-\u297F][\uFE00-\uFEFF]?|[\u2B00-\u2BF0][\uFE00-\uFEFF]?|(?:\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDEFF])[\uFE00-\uFEFF]?|[\u20E3]|[\u26A0-\u3000]|\uD83E[\udd00-\uddff]|[\u00A0-\u269F]/g

/** Remove emojis and trailing/leading spaces from camparator inputs using regex. */
const removeEmojisAndSpaces = str => str.replace(regexEmojis, '').trim()

/** The default comparator that can be used in sort. */
export const compare = (a, b) => a > b ? 1 : a < b ? -1 : 0

// const compareReasonable = (a, b) => {
//   const aIsNum = !isNaN(a)
//   const bIsNum = !isNaN(b)

//   // numbers always non-numbers
//   return aIsNum && !bIsNum ? -1
//     : bIsNum && !aIsNum ? 1
//       // numbers must be parsed as numbers
//       : compare(
//         aIsNum ? +a : lower(a),
//         bIsNum ? +b : lower(b)
//       )
// }

/** A comparator that sorts string starting with emojis ahead of other. */
export const compareStringsWithEmojis = (a, b) => {
  const aStartsWithEmoji = regexEmojis.test(a)
  const bStartsWithEmoji = regexEmojis.test(b)
  const aStripped = removeEmojisAndSpaces(a)
  const bStripped = removeEmojisAndSpaces(b)
  return aStartsWithEmoji && !bStartsWithEmoji ? -1
    : bStartsWithEmoji && !aStartsWithEmoji ? 1
    : aStartsWithEmoji && bStartsWithEmoji ? compareReasonable(aStripped, bStripped)
    : 0
}

/** A comparator that sorts empty thoughts ahead of non-empty thoughts. */
export const compareEmpty = (a, b) => {
  const aIsEmpty = a === ''
  const bIsEmpty = b === ''
  return aIsEmpty && !bIsEmpty ? -1
    : bIsEmpty && !aIsEmpty ? 1
    : 0
}

/** A comparator that sorts numbers ahead of non-numbers. */
export const compareNumberAndOther = (a, b) => {
  const aIsNum = !isNaN(a)
  const bIsNum = !isNaN(b)
  return aIsNum && !bIsNum ? -1
    : bIsNum && !aIsNum ? 1
    : 0
}

/** A comparator that sorts numbers in numeric order. */
export const compareNumbers = (a, b) => {
  const aIsNum = !isNaN(a)
  const bIsNum = !isNaN(b)
  return aIsNum && bIsNum ? compare(+a, +b)
    : 0
}

/** A case-insensitive lexicographic comparator. */
export const compareLowercase = (a, b) => compare(lower(a), lower(b))

/** A comparator function that sorts strings that start with punctuation above others. */
export const comparePunctuationAndOther = (a, b) => {
  const aIsPunctuation = regexPunctuation.test(a)
  const bIsPunctuation = regexPunctuation.test(b)
  return aIsPunctuation && !bIsPunctuation ? -1
    : bIsPunctuation && !aIsPunctuation ? 1
    : 0
}

/** A comparison function that sorts date strings. */
export const compareDateStrings = (a, b) => compare(Date.parse(a), Date.parse(b))

/** A comparator function that sorts date strings above others. */
const compareDateAndOther = (a, b) => {
  const aIsDate = !isNaN(Date.parse(a))
  const bIsDate = !isNaN(Date.parse(b))
  return aIsDate && !bIsDate ? -1
    : bIsDate && !aIsDate ? 1
    : 0
}

/** Creates a composite comparator consisting of each of the given comparators checked in order. */
export const makeOrderedComparator = comparators =>
  (a, b) =>
    comparators.length === 0
      // base case
      ? 0
      // if the values are non equal by the initial comparator, return the result of the comparator
      : comparators[0](a, b) ||
        // if they are equal, move on to the next comparator
        makeOrderedComparator(comparators.slice(1))(a, b) // RECURSION

// eslint-disable-next-line jsdoc/require-description-complete-sentence
/** A comparator that compares by reasonable, human-readable value:
  1. punctuation (=, +, #hi, =test)
  2. numbers (8, 9, 10)
  3. dates (9/1, 10/1, 11/1)
  4. lexicographic (default)
 */
const compareReasonable = makeOrderedComparator([
  compareEmpty,
  comparePunctuationAndOther,
  compareNumberAndOther,
  compareNumbers,
  compareDateAndOther,
  compareDateStrings,
  compareStringsWithEmojis,
  compareLowercase,
])

/** Compare the value of two thoughts. */
export const compareThought = (a, b) => compareReasonable(a.value, b.value)
