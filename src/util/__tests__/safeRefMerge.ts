import safeRefMerge from '../../util/safeRefMerge'

it('merges two objects', () => {
  const a = { a: 1, x: 1 }
  const b = { b: 2, x: 2 }
  const result = safeRefMerge(a, b)
  expect(result).toMatchObject({
    a: 1,
    b: 2,
    x: 2,
  })
})

it('merges three objects', () => {
  const a = { a: 1, x: 1 }
  const b = { b: 2, x: 2 }
  const c = { c: 3, x: 3 }
  const result = safeRefMerge(a, b, c)
  expect(result).toMatchObject({
    a: 1,
    b: 2,
    c: 3,
    x: 3,
  })
})

it('returns null and undefined as-is', () => {
  expect(safeRefMerge(null)).toEqual(null)
  expect(safeRefMerge(undefined)).toEqual(undefined)
  expect(safeRefMerge(null, undefined)).toEqual(null) // unexpected ordering?
  expect(safeRefMerge(undefined, null)).toEqual(undefined)
})

it('returns empty objects as-is', () => {
  const o = {}
  expect(safeRefMerge(o)).toEqual(o)
})

it('merges two objects ignoring falsey objects', () => {
  const a = { a: 1, x: 1 }
  const b = { b: 2, x: 2 }
  const expected = {
    a: 1,
    b: 2,
    x: 2,
  }
  expect(safeRefMerge(null, a, b)).toMatchObject(expected)
  expect(safeRefMerge(a, null, b)).toMatchObject(expected)
  expect(safeRefMerge(a, b, null)).toMatchObject(expected)
})

it('if one object is falsey, returns the other', () => {
  const a = { a: 1 }
  expect(safeRefMerge(a, null)).toEqual(a)
  expect(safeRefMerge(null, a)).toEqual(a)
  expect(safeRefMerge(a, null, null)).toEqual(a)
  expect(safeRefMerge(null, a, null)).toEqual(a)
  expect(safeRefMerge(null, null, a)).toEqual(a)

  expect(safeRefMerge(a, undefined)).toEqual(a)
  expect(safeRefMerge(undefined, a)).toEqual(a)
})

it('if one object is empty, returns the other', () => {
  const a = { a: 1 }
  expect(safeRefMerge(a, {})).toEqual(a)
  expect(safeRefMerge({}, a)).toEqual(a)
})

it('if both objects are empty, returns the first', () => {
  const a = {}
  const b = {}
  expect(safeRefMerge(a, b)).toEqual(a)
  expect(safeRefMerge(b, a)).toEqual(b)
})
