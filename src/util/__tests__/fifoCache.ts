import fifoCache from '../fifoCache'

it('add item to cache and return removed item when max is reached', () => {
  const cache = fifoCache<number>(3)
  expect(cache.add(1)).toBe(null)
  expect(cache.add(2)).toBe(null)
  expect(cache.add(3)).toBe(null)
  expect(cache.add(4)).toBe(1)
  expect(cache.add(5)).toBe(2)
})

it('bump existing item to top', () => {
  const cache = fifoCache<number>(3)
  expect(cache.add(1)).toBe(null)
  expect(cache.add(2)).toBe(null)
  expect(cache.add(3)).toBe(null)
  expect(cache.add(4)).toBe(1)
  expect(cache.add(2)).toBe(null)
  expect(cache.add(5)).toBe(3)
})

it('add multiple items to cache and return an array of deleted items', () => {
  const cache = fifoCache<number>(4)
  expect(cache.addMany([1, 2, 3])).toEqual([])
  expect(cache.addMany([4, 2, 5])).toEqual([1]) // 5 bumps 2
  expect(cache.addMany([4, 6, 7])).toEqual([3, 2]) // 6 bumps 3, 7 bumps 2
})
