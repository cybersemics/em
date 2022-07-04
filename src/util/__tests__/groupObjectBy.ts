import groupObjectBy from '../groupObjectBy'

test('groupObjectBy', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    e: 5,
    inf: Infinity,
  }

  /** Categorizes an object of numbers in a somewhat arbitrary fashion. */
  const categorizer = (key: string, value: number) => (key === 'inf' ? 'unknown' : value % 2 === 0 ? 'even' : 'odd')

  expect(groupObjectBy(obj, categorizer)).toEqual({
    even: {
      b: 2,
      d: 4,
    },
    odd: {
      a: 1,
      c: 3,
      e: 5,
    },
    unknown: {
      inf: Infinity,
    },
  })
})
