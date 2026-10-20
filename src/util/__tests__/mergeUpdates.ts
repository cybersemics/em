import mergeUpdates from '../../util/mergeUpdates'

it('merge', () => {
  expect(mergeUpdates({ a: 0, c: 1 }, { a: 1, b: 2 })).toEqual({
    a: 1,
    b: 2,
    c: 1,
  })
})

it('do not merge falsey values', () => {
  expect(mergeUpdates({ a: 1 }, { b: null, c: 0, d: '', e: undefined })).toEqual({
    a: 1,
  })
})

it('delete falsey values', () => {
  expect(mergeUpdates({ a: 1, b: 2 }, { b: null })).toEqual({
    a: 1,
  })
})

it('preserves untouched entries and replaces updated records without merging their fields', () => {
  const original = { oldField: true }
  const replacement = { newField: true }
  const merged = mergeUpdates<Record<string, boolean>>({ a: original, b: original, c: null }, { a: replacement })

  expect(merged).toEqual({ a: replacement, b: original, c: null })
  expect(merged.a).toBe(replacement)
  expect(merged.b).toBe(original)
})

it('do not mutate arguments', () => {
  const mergeInto = { a: 1, b: 2 }
  const mergee = { b: null }
  mergeUpdates(mergeInto, mergee)
  expect(mergeInto).toEqual({ a: 1, b: 2 })
  expect(mergee).toEqual({ b: null })
})
