import {
  compare,
  compareDateStrings,
  compareLowercase,
  compareNumberAndOther,
  compareNumbers,
  compareReasonable,
  comparePunctuationAndOther,
  compareStringsWithEmoji,
  makeOrderedComparator,
} from '../../util/compareThought'

it('compareNumberAndOther', () => {
  expect(compareNumberAndOther(1, 2)).toBe(0)
  expect(compareNumberAndOther('a', 'b')).toBe(0)
  expect(compareNumberAndOther(1, 'a')).toBe(-1)
  expect(compareNumberAndOther('1', 'a')).toBe(-1)
  expect(compareNumberAndOther('a', 1)).toBe(1)
  expect(compareNumberAndOther('a', '1')).toBe(1)
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
  expect(makeOrderedComparator([compare, compareNumberAndOther])(1, 'a')).toBe(-1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])('a', 1)).toBe(1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])('a', 'a')).toBe(0)

  expect(makeOrderedComparator([compareNumberAndOther, compare])(1, 'a')).toBe(-1)
  expect(makeOrderedComparator([compareNumberAndOther, compare])('a', 1)).toBe(1)
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

})
