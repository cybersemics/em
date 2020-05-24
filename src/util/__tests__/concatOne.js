import {
  concatOne,
} from '../../util'

it('concatenate', () => {
  expect(concatOne(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c', 'd'])
})

it('non-destructive', () => {
  const arr = ['a', 'b', 'c']
  concatOne(arr, 'd')
  expect(arr).toEqual(['a', 'b', 'c'])
})
