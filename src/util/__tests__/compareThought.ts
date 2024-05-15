import Thought from '../../@types/Thought'
import { HOME_TOKEN } from '../../constants'
import {
  compare,
  compareDateStrings,
  compareFormatting,
  compareLowercase,
  compareNumberAndOther,
  compareNumbers,
  comparePunctuationAndOther,
  compareReasonable,
  compareStringsWithEmoji,
  compareThoughtDescending,
  makeOrderedComparator,
} from '../../util/compareThought'
import timestamp from '../../util/timestamp'
import createId from '../createId'

/** Build a test thought with the given value. */
const thought = (value: string): Thought => ({
  id: createId(),
  rank: 0,
  value: value,
  parentId: HOME_TOKEN,
  childrenMap: {},
  lastUpdated: timestamp(),
  updatedBy: '',
})

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

  // number ranges
  // hyphen
  expect(compareNumbers('2', '100-200')).toBe(-1)
  expect(compareNumbers('100-200', '2')).toBe(1)
  // en dash
  expect(compareNumbers('2', '100–200')).toBe(-1)
  expect(compareNumbers('100–200', '2')).toBe(1)
  // em dash
  expect(compareNumbers('2', '100—200')).toBe(-1)
  expect(compareNumbers('100—200', '2')).toBe(1)
  // surrounding spaces
  expect(compareNumbers('2', '100 - 200')).toBe(-1)
  expect(compareNumbers('100 - 200', '2')).toBe(1)
  // irregular spaces
  expect(compareNumbers('2', '100-  200')).toBe(-1)
  expect(compareNumbers('100-  200', '2')).toBe(1)
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

it('compareFormatting', () => {
  expect(compareFormatting(':', '<b>B</b>')).toBe(1)
  expect(compareFormatting('<b', '<b>B</b>')).toBe(1)
  expect(compareFormatting('<p>a</p>', '<b>B</b>')).toBe(1)
  expect(compareFormatting('<p>a</p>', '<strike>B</strike>')).toBe(1)
  expect(compareFormatting('<i>a</i>', '<a>B</a>')).toBe(-1)
  expect(compareFormatting('<u>a</u>', 'B')).toBe(-1)
  expect(compareFormatting('<strike>a</strike>', 'B')).toBe(-1)
  expect(compareFormatting('<b>A</b>', '<b>B</b>')).toBe(0)
  expect(compareFormatting('<i>A</i>', '<i>B</i>')).toBe(0)
  expect(compareFormatting('<u>A</u>', '<u>B</u>')).toBe(0)
  expect(compareFormatting('<b>A</b>', '<strike>B</strike>')).toBe(0)
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
  // set type explicitly, otherwise it infers too general a type from the first item in the array
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])(1, 2)).toBe(-1)
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])(2, 1)).toBe(1)
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])(2, 1)).toBe(1)

  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])(1, 2)).toBe(-1)
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])(2, 1)).toBe(1)
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])(2, 1)).toBe(1)
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])(1, 'a')).toBe(-1)
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])('a', 1)).toBe(1)
  expect(makeOrderedComparator<string | number>([compare, compareNumberAndOther])('a', 'a')).toBe(0)

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
    expect(compareReasonable('The Apple', 'Apple')).toBe(0)
    expect(compareReasonable('The Apple', 'Book')).toBe(-1)
    expect(compareReasonable('Theatre', 'Book')).toBe(1)
    expect(compareReasonable('The Apple', 'Theatre')).toBe(-1)
    expect(compareReasonable('🍍 The Apple', '🍍 Book')).toBe(-1)
    expect(compareReasonable('🍍 The Apple', '🍍 Apple')).toBe(0)
  })

  it('diacritics', () => {
    expect(compareReasonable('élan', 'every')).toBe(-1)
    expect(compareReasonable('élan', 'élan')).toBe(0)
    expect(compareReasonable('every', 'élan')).toBe(1)
  })
})

describe('compareThought', () => {
  describe('descending', () => {
    it('sort emojis above non-emojis and sort within emoji group in descending order', () => {
      expect(compareThoughtDescending(thought('a'), thought('a'))).toBe(0)
      expect(compareThoughtDescending(thought('a'), thought('b'))).toBe(1)
      expect(compareThoughtDescending(thought('🍍 a'), thought('a'))).toBe(1)
      expect(compareThoughtDescending(thought('🍍 a'), thought('b'))).toBe(1)
      expect(compareThoughtDescending(thought('a'), thought('🍍 a'))).toBe(-1)
      expect(compareThoughtDescending(thought('b'), thought('🍍 a'))).toBe(-1)
      expect(compareThoughtDescending(thought('🍍 a'), thought('🍍 a'))).toBe(0)
      expect(compareThoughtDescending(thought('🍍 a'), thought('🍍 b'))).toBe(1)
    })

    it('sort meta-attributes above everything', () => {
      expect(compareThoughtDescending(thought('a'), thought('=test'))).toBe(-1)
      expect(compareThoughtDescending(thought('=test'), thought('a'))).toBe(1)
      expect(compareThoughtDescending(thought('=test'), thought('=test'))).toBe(0)
      expect(compareThoughtDescending(thought('🍍'), thought('=test'))).toBe(-1)
      expect(compareThoughtDescending(thought('=test'), thought('🍍'))).toBe(1)
    })

    it('sort by removing ignored prefixes in descending order', () => {
      expect(compareThoughtDescending(thought('the apple'), thought('apple'))).toBe(0)
      expect(compareThoughtDescending(thought('the apple'), thought('book'))).toBe(1)
      expect(compareThoughtDescending(thought('theatre'), thought('book'))).toBe(-1)
      expect(compareThoughtDescending(thought('the apple'), thought('theatre'))).toBe(1)
      expect(compareThoughtDescending(thought('🍍 the apple'), thought('🍍 book'))).toBe(1)
      expect(compareThoughtDescending(thought('🍍 the apple'), thought('🍍 apple'))).toBe(0)
    })
  })
})
