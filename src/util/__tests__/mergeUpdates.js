import {
  mergeUpdates,
} from '../../util'

it('merge', () => {
  expect(mergeUpdates({ a: 0, c: 1 }, { a: 1, b: 2 })).toEqual({
    a: 1,
    b: 2,
    c: 1
  })
})

it('do not merge falsey values', () => {
  expect(mergeUpdates({ a: 1 }, { b: null, c: 0, d: '', e: undefined })).toEqual({
    a: 1
  })
})

it('delete falsey values', () => {
  expect(mergeUpdates({ a: 1, b: 2 }, { b: null })).toEqual({
    a: 1
  })
})

it('do not mutate arguments', () => {
  const mergeInto = { a: 1, b: 2 }
  const mergee = { b: null }
  mergeUpdates(mergeInto, mergee)
  expect(mergeInto).toEqual({ a: 1, b: 2 })
  expect(mergee).toEqual({ b: null })
})
