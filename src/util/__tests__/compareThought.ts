import {
  compare,
  compareDateStrings,
  compareLowercase,
  compareNumberAndOther,
  compareNumbers,
  comparePunctuationAndOther,
  compareReasonable,
  compareStringsWithEmoji,
  makeOrderedComparator,
  compareThoughtDescending,
} from '../../util/compareThought'
import { Child } from '../../@types/Child'

it('compareNumberAndOther', () => {
  expect(compareNumberAndOther(1, 2)).toBe(0)
  expect(compareNumberAndOther('a', 'b')).toBe(0)
  expect(compareNumberAndOther(1, 'a')).toBe(-1)
  expect(compareNumberAndOther('1', 'a')).toBe(-1)
  expect(compareNumberAndOther('a', 1)).toBe(1)
  expect(compareNumberAndOther('a', '1')).toBe(1)
  expect(compareNumberAndOther('#1', 1)).toBe(0)
  expect(compareNumberAndOther('#1', 'a')).toBe(-1)
  expect(compareNumberAndOther('a', '#1')).toBe(1)
})

it('compareNumbers', () => {
  expect(compareNumbers(1, 1)).toBe(0)
  expect(compareNumbers(1, 2)).toBe(-1)
  expect(compareNumbers(2, 1)).toBe(1)
  expect(compareNumbers(1, 'a')).toBe(0)
  expect(compareNumbers('a', 1)).toBe(0)
  expect(compareNumbers('1', '1')).toBe(0)
  expect(compareNumbers('1', '2')).toBe(-1)
  expect(compareNumbers('2', '1')).toBe(1)
  expect(compareNumbers('9', '10')).toBe(-1)
  expect(compareNumbers('10', '9')).toBe(1)

  // prefixed number strings
  expect(compareNumbers('#1', '#1')).toBe(0)
  expect(compareNumbers('#1', '#2')).toBe(-1)
  expect(compareNumbers('#2', '#1')).toBe(1)
  expect(compareNumbers('#9', '#10')).toBe(-1)
  expect(compareNumbers('#10', '#9')).toBe(1)
  expect(compareNumbers('# 1', '# 1')).toBe(0)
  expect(compareNumbers('# 1', '# 2')).toBe(-1)
  expect(compareNumbers('# 2', '# 1')).toBe(1)
  expect(compareNumbers('# 9', '# 10')).toBe(-1)
  expect(compareNumbers('# 10', '# 9')).toBe(1)

  // currencies
  expect(compareNumbers('$9', '#10')).toBe(-1)
  expect(compareNumbers('€9', '€10')).toBe(-1)
  expect(compareNumbers('₤9', '₤10')).toBe(-1)
  expect(compareNumbers('₪9', '₪10')).toBe(-1)
})

it('compareLowercase', () => {
  expect(compareLowercase('a', 'b')).toBe(-1)
  expect(compareLowercase('a', 'B')).toBe(-1)
  expect(compareLowercase('a', 'a')).toBe(0)
  expect(compareLowercase('a', 'A')).toBe(0)
  expect(compareLowercase('b', 'a')).toBe(1)
  expect(compareLowercase('b', 'A')).toBe(1)
  expect(compareLowercase('b', 'b')).toBe(0)
  expect(compareLowercase('b', 'B')).toBe(0)
})

it('comparePunctuationAndOther', () => {
  expect(comparePunctuationAndOther('=test', 1)).toBe(-1)
  expect(comparePunctuationAndOther('=test', 'a')).toBe(-1)
  expect(comparePunctuationAndOther(1, '=test')).toBe(1)
  expect(comparePunctuationAndOther('a', '=test')).toBe(1)
  expect(comparePunctuationAndOther('=hello', '=test')).toBe(0)
  expect(comparePunctuationAndOther('a', 'b')).toBe(0)
  expect(comparePunctuationAndOther(1, 'b')).toBe(0)
  expect(comparePunctuationAndOther(1, 2)).toBe(0)
})

it('compareDateStrings', () => {
  expect(compareDateStrings('9/11', '9/11')).toBe(0)
  expect(compareDateStrings('9/11', '10/11')).toBe(-1)
  expect(compareDateStrings('10/11', '9/11')).toBe(1)
  expect(compareDateStrings('March 3, 2020', 'December 3, 2020')).toBe(-1)
  expect(compareDateStrings('December 3, 2020', 'March 3, 2020')).toBe(1)
  expect(compareDateStrings('March 3, 2020', 'December 3, 2019')).toBe(1)
  expect(compareDateStrings('December 3, 2019', 'March 3, 2020')).toBe(-1)
})

it('compareStringsWithEmoji', () => {
  expect(compareStringsWithEmoji('a', 'b')).toBe(0)
  expect(compareStringsWithEmoji('🍍 a', 'b')).toBe(-1)
  expect(compareStringsWithEmoji('b', '🍍 a')).toBe(1)
  expect(compareStringsWithEmoji('🍍 a', '🍍 b')).toBe(0)
})

it('makeOrderedComparator', () => {
  expect(makeOrderedComparator([compare])(1, 1)).toBe(0)
  expect(makeOrderedComparator([compare])(1, 2)).toBe(-1)
  expect(makeOrderedComparator([compare])(1, 1)).toBe(0)

  expect(makeOrderedComparator([compare, compareNumberAndOther])(1, 2)).toBe(-1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])(2, 1)).toBe(1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])(2, 1)).toBe(1)
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])(1, 'a')).toBe(-1)
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])('a', 1)).toBe(1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])('a', 'a')).toBe(0)

  expect(makeOrderedComparator<string | number>([compareNumberAndOther, compare])(1, 'a')).toBe(-1)
  expect(makeOrderedComparator<string | number>([compareNumberAndOther, compare])('a', 1)).toBe(1)
})

describe('compareReasonable', () => {
  it('sort emojis above non-emojis and sort within emoji group', () => {
    expect(compareReasonable('a', 'a')).toBe(0)
    expect(compareReasonable('a', 'b')).toBe(-1)
    expect(compareReasonable('🍍 a', 'a')).toBe(-1)
    expect(compareReasonable('🍍 a', 'b')).toBe(-1)
    expect(compareReasonable('a', '🍍 a')).toBe(1)
    expect(compareReasonable('b', '🍍 a')).toBe(1)
    expect(compareReasonable('🍍 a', '🍍 a')).toBe(0)
    expect(compareReasonable('🍍 a', '🍍 b')).toBe(-1)
  })

  it('sort by removing ignored prefixes', () => {
    expect(compareReasonable('the apple', 'apple')).toBe(0)
    expect(compareReasonable('the apple', 'book')).toBe(-1)
    expect(compareReasonable('theatre', 'book')).toBe(1)
    expect(compareReasonable('the apple', 'theatre')).toBe(-1)
    expect(compareReasonable('🍍 the apple', '🍍 book')).toBe(-1)
    expect(compareReasonable('🍍 the apple', '🍍 apple')).toBe(0)
  })
})

describe('compareReasonableDescending', () => {
  /**
   * Build Child object for tests.
   */
  const buildChild = (value: string): Child => ({ id: '0', rank: 0, value: value })

  it('sort emojis above non-emojis and sort within emoji group in descending order', () => {
    expect(compareThoughtDescending(buildChild('a'), buildChild('a'))).toBe(0)
    expect(compareThoughtDescending(buildChild('a'), buildChild('b'))).toBe(1)
    expect(compareThoughtDescending(buildChild('🍍 a'), buildChild('a'))).toBe(1)
    expect(compareThoughtDescending(buildChild('🍍 a'), buildChild('b'))).toBe(1)
    expect(compareThoughtDescending(buildChild('a'), buildChild('🍍 a'))).toBe(-1)
    expect(compareThoughtDescending(buildChild('b'), buildChild('🍍 a'))).toBe(-1)
    expect(compareThoughtDescending(buildChild('🍍 a'), buildChild('🍍 a'))).toBe(0)
    expect(compareThoughtDescending(buildChild('🍍 a'), buildChild('🍍 b'))).toBe(1)
  })

  it('sort by removing ignored prefixes in descending order', () => {
    expect(compareThoughtDescending(buildChild('the apple'), buildChild('apple'))).toBe(0)
    expect(compareThoughtDescending(buildChild('the apple'), buildChild('book'))).toBe(1)
    expect(compareThoughtDescending(buildChild('theatre'), buildChild('book'))).toBe(-1)
    expect(compareThoughtDescending(buildChild('the apple'), buildChild('theatre'))).toBe(1)
    expect(compareThoughtDescending(buildChild('🍍 the apple'), buildChild('🍍 book'))).toBe(1)
    expect(compareThoughtDescending(buildChild('🍍 the apple'), buildChild('🍍 apple'))).toBe(0)
  })
})
