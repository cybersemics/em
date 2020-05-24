import {
  concatMany,
} from '../../util'

it('concatenate', () => {
  expect(concatMany(['a', 'b', 'c'], ['d'])).toEqual(['a', 'b', 'c', 'd'])
})

it('non-destructive', () => {
  const arr = ['a', 'b', 'c']
  concatMany(arr, ['d'])
  expect(arr).toEqual(['a', 'b', 'c'])
})
