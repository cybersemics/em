import splice from '../../util/splice'

it('splice', () => {
  expect(splice([1, 2, 3], 1, 1)).toEqual([1, 3])
  expect(splice([1, 2, 3], 1, 1, 4)).toEqual([1, 4, 3])
})
