import Path from '../../@types/Path'
import groupPaths from '../groupPaths'

test('shared parent', () => {
  const paths = [
    ['a', 'x'],
    ['a', 'y'],
  ] as unknown as Path[]

  expect(groupPaths(paths)).toEqual({
    a: {
      x: { _: {} },
      y: { _: {} },
    },
  })
})

test('ignore duplicates', () => {
  const paths = [
    ['a', 'b'],
    ['a', 'b'],
  ] as unknown as Path[]

  expect(groupPaths(paths)).toEqual({
    a: { b: { _: {} } },
  })
})

test('no shared ancestors', () => {
  const paths = [
    ['a', 'b'],
    ['x', 'y'],
  ] as unknown as Path[]

  expect(groupPaths(paths)).toEqual({
    a: {
      b: { _: {} },
    },
    x: {
      y: { _: {} },
    },
  })
})

test('multiple shared ancestors', () => {
  const paths = [
    ['a', 'b', 'x'],
    ['a', 'b', 'y'],
  ] as unknown as Path[]

  expect(groupPaths(paths)).toEqual({
    a: {
      b: {
        x: { _: {} },
        y: { _: {} },
      },
    },
  })
})

test('parent, child', () => {
  const paths = [['a'], ['a', 'x']] as unknown as Path[]

  expect(groupPaths(paths)).toEqual({
    a: {
      _: {},
      x: { _: {} },
    },
  })
})

test('child, parent', () => {
  const paths = [['a', 'x'], ['a']] as unknown as Path[]

  expect(groupPaths(paths)).toEqual({
    a: {
      _: {},
      x: { _: {} },
    },
  })
})

test('noncontiguous', () => {
  const paths = [['a', 'b', 'x'], ['z'], ['a', 'b', 'y']] as unknown as Path[]

  expect(groupPaths(paths)).toEqual({
    a: {
      b: {
        x: { _: {} },
        y: { _: {} },
      },
    },
    z: { _: {} },
  })
})
