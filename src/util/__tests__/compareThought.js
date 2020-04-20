import {
  compare,
  compareDateStrings,
  compareLowercase,
  compareNumberAndOther,
  compareNumbers,
  comparePunctuationAndOther,
  makeOrderedComparator,
} from '../../util/compareThought'

it('compareNumberAndOther', () => {
  expect(compareNumberAndOther(1, 2)).toEqual(0)
  expect(compareNumberAndOther('a', 'b')).toEqual(0)
  expect(compareNumberAndOther(1, 'a')).toEqual(-1)
  expect(compareNumberAndOther('1', 'a')).toEqual(-1)
  expect(compareNumberAndOther('a', 1)).toEqual(1)
  expect(compareNumberAndOther('a', '1')).toEqual(1)
})

it('compareNumbers', () => {
  expect(compareNumbers(1, 1)).toEqual(0)
  expect(compareNumbers(1, 2)).toEqual(-1)
  expect(compareNumbers(2, 1)).toEqual(1)
  expect(compareNumbers(1, 'a')).toEqual(0)
  expect(compareNumbers('a', 1)).toEqual(0)
  expect(compareNumbers('1', '1')).toEqual(0)
  expect(compareNumbers('1', '2')).toEqual(-1)
  expect(compareNumbers('2', '1')).toEqual(1)
  expect(compareNumbers('9', '10')).toEqual(-1)
  expect(compareNumbers('10', '9')).toEqual(1)
})

it('compareLowercase', () => {
  expect(compareLowercase('a', 'b')).toEqual(-1)
  expect(compareLowercase('a', 'B')).toEqual(-1)
  expect(compareLowercase('a', 'a')).toEqual(0)
  expect(compareLowercase('a', 'A')).toEqual(0)
  expect(compareLowercase('b', 'a')).toEqual(1)
  expect(compareLowercase('b', 'A')).toEqual(1)
  expect(compareLowercase('b', 'b')).toEqual(0)
  expect(compareLowercase('b', 'B')).toEqual(0)
})

it('comparePunctuationAndOther', () => {
  expect(comparePunctuationAndOther('=test', 1)).toEqual(-1)
  expect(comparePunctuationAndOther('=test', 'a')).toEqual(-1)
  expect(comparePunctuationAndOther(1, '=test')).toEqual(1)
  expect(comparePunctuationAndOther('a', '=test')).toEqual(1)
  expect(comparePunctuationAndOther('=hello', '=test')).toEqual(0)
  expect(comparePunctuationAndOther('a', 'b')).toEqual(0)
  expect(comparePunctuationAndOther(1, 'b')).toEqual(0)
  expect(comparePunctuationAndOther(1, 2)).toEqual(0)
})

it('compareDateStrings', () => {
  expect(compareDateStrings('9/11', '9/11')).toEqual(0)
  expect(compareDateStrings('9/11', '10/11')).toEqual(-1)
  expect(compareDateStrings('10/11', '9/11')).toEqual(1)
  expect(compareDateStrings('March 3, 2020', 'December 3, 2020')).toEqual(-1)
  expect(compareDateStrings('December 3, 2020', 'March 3, 2020')).toEqual(1)
  expect(compareDateStrings('March 3, 2020', 'December 3, 2019')).toEqual(1)
  expect(compareDateStrings('December 3, 2019', 'March 3, 2020')).toEqual(-1)
})

it('makeOrderedComparator', () => {
  expect(makeOrderedComparator([compare])(1, 1)).toEqual(0)
  expect(makeOrderedComparator([compare])(1, 2)).toEqual(-1)
  expect(makeOrderedComparator([compare])(1, 1)).toEqual(0)

  expect(makeOrderedComparator([compare, compareNumberAndOther])(1, 2)).toEqual(-1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])(2, 1)).toEqual(1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])(2, 1)).toEqual(1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])(1, 'a')).toEqual(-1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])('a', 1)).toEqual(1)
  expect(makeOrderedComparator([compare, compareNumberAndOther])('a', 'a')).toEqual(0)

  expect(makeOrderedComparator([compareNumberAndOther, compare])(1, 'a')).toEqual(-1)
  expect(makeOrderedComparator([compareNumberAndOther, compare])('a', 1)).toEqual(1)
})
