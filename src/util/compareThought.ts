//@ts-nocheck

import { lower } from './lower'
import { Child } from '../types'
import { ComparatorValue, ComparatorFunction } from '../utilTypes'

const regexPunctuation = /^[!@#$%^&*()\-_=+[\]{};:'"<>.,?\\/].*/
const regexEmojis = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/ug

/** Remove emojis from camparator inputs using regex. */
const removeEmojis = (str: string): string => str.replace(regexEmojis, '')

/* The default comparator that can be used in sort */
export const compare = (a:any, b: any): ComparatorValue => a > b ? 1 : a < b ? -1 : 0

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
  const aIsNum = !Number.isNaN(a)
  const bIsNum = !Number.isNaN(b)
  return aIsNum && !bIsNum ? -1
    : bIsNum && !aIsNum ? 1
    : 0
}

/** A comparator that sorts numbers in numeric order. */
export const compareNumbers = (a: number, b:number): ComparatorValue => {
  const aIsNum = !isNaN(a)
  const bIsNum = !isNaN(b)
  return aIsNum && bIsNum ? compare(+a, +b)
    : 0
}

/** A case-insensitive lexicographic comparator. */
export const compareLowercase = (a: string, b: string): ComparatorValue => compare(lower(a), lower(b))

/** A comparator function that sorts strings that start with punctuation above others */
export const comparePunctuationAndOther = (a: string, b: string): ComparatorValue => {
  const aIsPunctuation = regexPunctuation.test(a)
  const bIsPunctuation = regexPunctuation.test(b)
  return aIsPunctuation && !bIsPunctuation ? -1
    : bIsPunctuation && !aIsPunctuation ? 1
    : 0
}

/** A comparison function that sorts date strings. */
export const compareDateStrings = (a:string, b: string): ComparatorValue => {
  return compare(Date.parse(a), Date.parse(b))
}

/** A comparator function that sorts date strings above others */
const compareDateAndOther = (a: string, b: string): ComparatorValue => {
  const aIsDate = !isNaN(Date.parse(a))
  const bIsDate = !isNaN(Date.parse(b))
  return aIsDate && !bIsDate ? -1
    : bIsDate && !aIsDate ? 1
    : 0
}

/** Creates a composite comparator consisting of each of the given comparators checked in order. */
export const makeOrderedComparator = (comparators: ComparatorFunction<any>[]): ComparatorFunction<any> =>
  (a:any, b:any) =>
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
  compareLowercase,
])

/** Compare the value of two thoughts. */
export const compareThought = (a: Child, b: Child) => compareReasonable(removeEmojis(a.value), removeEmojis(b.value))
