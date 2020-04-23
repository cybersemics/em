import { lower } from './lower'

const regexPunctuation = /^[!@#$%^&*()\-_=+[\]{};:'"<>.,?\\/].*/

/* The default comparator that can be used in sort */
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

/* A comparator that sorts numbers ahead of non-numbers */
export const compareNumberAndOther = (a, b) => {
  const aIsNum = !isNaN(a)
  const bIsNum = !isNaN(b)
  return aIsNum && !bIsNum ? -1
    : bIsNum && !aIsNum ? 1
    : 0
}

/** A comparator that sorts numbers in numeric order */
export const compareNumbers = (a, b) => {
  const aIsNum = !isNaN(a)
  const bIsNum = !isNaN(b)
  return aIsNum && bIsNum ? compare(+a, +b)
    : 0
}

/** A case-insensitive lexicographic comparator */
export const compareLowercase = (a, b) => compare(lower(a), lower(b))

/** A comparator function that sorts strings that start with punctuation above others */
export const comparePunctuationAndOther = (a, b) => {
  const aIsPunctuation = regexPunctuation.test(a)
  const bIsPunctuation = regexPunctuation.test(b)
  return aIsPunctuation && !bIsPunctuation ? -1
    : bIsPunctuation && !aIsPunctuation ? 1
    : 0
}

/** A comparison function that sorts date strings */
export const compareDateStrings = (a, b) => {
  return compare(Date.parse(a), Date.parse(b))
}

/** A comparator function that sorts date strings above others */
const compareDateAndOther = (a, b) => {
  const aIsDate = !isNaN(Date.parse(a))
  const bIsDate = !isNaN(Date.parse(b))
  return aIsDate && !bIsDate ? -1
    : bIsDate && !aIsDate ? 1
    : 0
}

/* Creates a composite comparator consisting of each of the given comparators checked in order */
export const makeOrderedComparator = comparators =>
  (a, b) =>
    comparators.length === 0
      // base case
      ? 0
      // if the values are non equal by the initial comparator, return the result of the comparator
      : comparators[0](a, b) ||
        // if they are equal, move on to the next comparator
        makeOrderedComparator(comparators.slice(1))(a, b) // RECURSION

/** A comparator that compares by reasonable, human-readable value:
  1. punctuation (=, +, #hi, =test)
  2. numbers (8, 9, 10)
  3. dates (9/1, 10/1, 11/1)
  4. lexicographic (default)
*/
const compareReasonable = makeOrderedComparator([
  comparePunctuationAndOther,
  compareNumberAndOther,
  compareNumbers,
  compareDateAndOther,
  compareDateStrings,
  compareLowercase,
])

// compare the value of the two thoughts
export const compareThought = (a, b) => compareReasonable(a.value, b.value)
