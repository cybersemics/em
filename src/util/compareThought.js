import { lower } from './lower'
// import assert from 'assert'

const regexPunctuation = /^[!@#$%^&*()\-_=+[\]{};:'"<>.,?\\/].*/

/* The default comparator that can be used in sort */
const compare = (a, b) => a > b ? 1 : a < b ? -1 : 0

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
const compareNumberAndOther = (a, b) => {
  const aIsNum = !isNaN(a)
  const bIsNum = !isNaN(b)
  return aIsNum && !bIsNum ? -1
    : bIsNum && !aIsNum ? 1
    : 0
}
// assert.strictEqual(compareNumberAndOther(1, 2), 0)
// assert.strictEqual(compareNumberAndOther('a', 'b'), 0)
// assert.strictEqual(compareNumberAndOther(1, 'a'), -1)
// assert.strictEqual(compareNumberAndOther('1', 'a'), -1)
// assert.strictEqual(compareNumberAndOther('a', 1), 1)
// assert.strictEqual(compareNumberAndOther('a', '1'), 1)

/** A comparator that sorts numbers in numeric order */
const compareNumbers = (a, b) => {
  const aIsNum = !isNaN(a)
  const bIsNum = !isNaN(b)
  return aIsNum && bIsNum ? compare(+a, +b)
    : 0
}

// assert.strictEqual(compareNumbers(1, 1), 0)
// assert.strictEqual(compareNumbers(1, 2), -1)
// assert.strictEqual(compareNumbers(2, 1), 1)
// assert.strictEqual(compareNumbers(1, 'a'), 0)
// assert.strictEqual(compareNumbers('a', 1), 0)
// assert.strictEqual(compareNumbers('1', '1'), 0)
// assert.strictEqual(compareNumbers('1', '2'), -1)
// assert.strictEqual(compareNumbers('2', '1'), 1)
// assert.strictEqual(compareNumbers('9', '10'), -1)
// assert.strictEqual(compareNumbers('10', '9'), 1)

/** A case-insensitive lexicographic comparator */
const compareLowercase = (a, b) => compare(lower(a), lower(b))

// assert.strictEqual(compareLowercase('a', 'b'), -1)
// assert.strictEqual(compareLowercase('a', 'B'), -1)
// assert.strictEqual(compareLowercase('a', 'a'), 0)
// assert.strictEqual(compareLowercase('a', 'A'), 0)
// assert.strictEqual(compareLowercase('b', 'a'), 1)
// assert.strictEqual(compareLowercase('b', 'A'), 1)
// assert.strictEqual(compareLowercase('b', 'b'), 0)
// assert.strictEqual(compareLowercase('b', 'B'), 0)

/** A comparator function that sorts strings that start with punctuation above others */
const comparePunctuationAndOther = (a, b) => {
  const aIsPunctuation = regexPunctuation.test(a)
  const bIsPunctuation = regexPunctuation.test(b)
  return aIsPunctuation && !bIsPunctuation ? -1
    : bIsPunctuation && !aIsPunctuation ? 1
    : 0
}

// assert.strictEqual(comparePunctuationAndOther('=test', 1), -1)
// assert.strictEqual(comparePunctuationAndOther('=test', 'a'), -1)
// assert.strictEqual(comparePunctuationAndOther(1, '=test'), 1)
// assert.strictEqual(comparePunctuationAndOther('a', '=test'), 1)
// assert.strictEqual(comparePunctuationAndOther('=hello', '=test'), 0)
// assert.strictEqual(comparePunctuationAndOther('a', 'b'), 0)
// assert.strictEqual(comparePunctuationAndOther(1, 'b'), 0)
// assert.strictEqual(comparePunctuationAndOther(1, 2), 0)

/** A comparison function that sorts date strings */
const compareDateStrings = (a, b) => {
  return compare(Date.parse(a), Date.parse(b))
}

// assert.strictEqual(compareDateStrings('9/11', '9/11'), 0)
// assert.strictEqual(compareDateStrings('9/11', '10/11'), -1)
// assert.strictEqual(compareDateStrings('10/11', '9/11'), 1)
// assert.strictEqual(compareDateStrings('March 3, 2020', 'December 3, 2020'), -1)
// assert.strictEqual(compareDateStrings('December 3, 2020', 'March 3, 2020'), 1)
// assert.strictEqual(compareDateStrings('March 3, 2020', 'December 3, 2019'), 1)
// assert.strictEqual(compareDateStrings('December 3, 2019', 'March 3, 2020'), -1)

/** A comparator function that sorts date strings above others */
const compareDateAndOther = (a, b) => {
  const aIsDate = !isNaN(Date.parse(a))
  const bIsDate = !isNaN(Date.parse(b))
  return aIsDate && !bIsDate ? -1
    : bIsDate && !aIsDate ? 1
    : 0
}

/* Creates a composite comparator consisting of each of the given comparators checked in order */
const makeOrderedComparator = comparators =>
  (a, b) =>
    comparators.length === 0
      // base case
      ? 0
      // if the values are non equal by the initial comparator, return the result of the comparator
      : comparators[0](a, b) ||
        // if they are equal, move on to the next comparator
        makeOrderedComparator(comparators.slice(1))(a, b) // RECURSION

// assert.strictEqual(makeOrderedComparator([compare])(1, 1), 0)
// assert.strictEqual(makeOrderedComparator([compare])(1, 2), -1)
// assert.strictEqual(makeOrderedComparator([compare])(1, 1), 0)

// assert.strictEqual(makeOrderedComparator([compare, compareNumberAndOther])(1, 2), -1)
// assert.strictEqual(makeOrderedComparator([compare, compareNumberAndOther])(2, 1), 1)
// assert.strictEqual(makeOrderedComparator([compare, compareNumberAndOther])(2, 1), 1)
// assert.strictEqual(makeOrderedComparator([compare, compareNumberAndOther])(1, 'a'), -1)
// assert.strictEqual(makeOrderedComparator([compare, compareNumberAndOther])('a', 1), 1)
// assert.strictEqual(makeOrderedComparator([compare, compareNumberAndOther])('a', 'a'), 0)

// assert.strictEqual(makeOrderedComparator([compareNumberAndOther, compare])(1, 'a'), -1)
// assert.strictEqual(makeOrderedComparator([compareNumberAndOther, compare])('a', 1), 1)

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
