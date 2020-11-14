import { keyValueBy } from '../keyValueBy'

test('generate new object from array using keys', () => {
  const result = keyValueBy(['a', 'b'], key => ({ [key]: key + '!' }))
  expect(result).toEqual({
    a: 'a!',
    b: 'b!',
  })
})

test('pass index', () => {
  const result = keyValueBy(['a', 'b'], (key, i) => ({ [key]: i }))
  expect(result).toEqual({
    a: 0,
    b: 1,
  })
})

test('omit entries by returning null', () => {
  const result = keyValueBy(['a', 'b'], (key, i) => i === 0 ? ({ [key]: i }) : null)
  expect(result).toEqual({
    a: 0,
  })
})

test('empty array', () => {
  const result = keyValueBy([], () => null)
  expect(result).toEqual({})
})
