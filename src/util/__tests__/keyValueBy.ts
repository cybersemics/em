import { keyValueBy } from '../keyValueBy'

test('generate new object from array using keys', () => {
  const result = keyValueBy(['a', 'b'], item => ({ [item]: item + '!' }))
  expect(result).toEqual({
    a: 'a!',
    b: 'b!',
  })
})

test('pass index if input is an array', () => {
  const result = keyValueBy(['a', 'b'], (item, i) => ({ [item]: i }))
  expect(result).toEqual({
    a: 0,
    b: 1,
  })
})

test('omit entries by returning null', () => {
  const result = keyValueBy(['a', 'b'], (item, i) => i === 0 ? { [item]: i } : null)
  expect(result).toEqual({
    a: 0,
  })
})

test('empty array', () => {
  const result = keyValueBy([], () => null)
  expect(result).toEqual({})
})

test('generate new object from object using keys and values', () => {
  const result = keyValueBy({ a: 1, b: 2 }, (key, value) => ({ [key]: value * 2 }))
  expect(result).toEqual({
    a: 2,
    b: 4,
  })
})

test('empty object', () => {
  const result = keyValueBy({}, () => null)
  expect(result).toEqual({})
})
