import importText from '../../action-creators/importText'
import indent from '../../action-creators/indent'
import jump from '../../action-creators/jump'
import newSubthought from '../../action-creators/newSubthought'
import newThought from '../../action-creators/newThought'
import { createTestStore } from '../../test-helpers/createTestStore'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pathToContext from '../../util/pathToContext'

it('jump to last edit point', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
        - d
        - e
      `,
    }),
    setCursor(['b']),
    editThought({
      oldValue: 'b',
      newValue: 'bb',
      at: ['b'],
    }),
    setCursor(['d']),
    editThought({
      oldValue: 'd',
      newValue: 'dd',
      at: ['d'],
    }),
    jump(),
  ])

  const state = store.getState()
  expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['bb'])
})

it('jump twice should restore the cursor to where it was before the first jump', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
        - d
        - e
      `,
    }),
    setCursor(['b']),
    editThought({
      oldValue: 'b',
      newValue: 'bb',
      at: ['b'],
    }),
    setCursor(['d']),
    editThought({
      oldValue: 'd',
      newValue: 'dd',
      at: ['d'],
    }),
    jump(),
    jump(),
  ])

  const state = store.getState()
  expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['dd'])
})

it('jump three times should be equivalent to jump once', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
        - d
        - e
      `,
    }),
    setCursor(['b']),
    editThought({
      oldValue: 'b',
      newValue: 'bb',
      at: ['b'],
    }),
    setCursor(['d']),
    editThought({
      oldValue: 'd',
      newValue: 'dd',
      at: ['d'],
    }),
    jump(),
    jump(),
    jump(),
  ])

  const state = store.getState()
  expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['bb'])
})

it('jump to last edit point in deeply nested thoughts', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
        - d
          - e
            - f
      `,
    }),
    setCursor(['a', 'b', 'c']),
    editThought({
      oldValue: 'c',
      newValue: 'cc',
      at: ['a', 'b', 'c'],
    }),
    setCursor(['d', 'e', 'f']),
    editThought({
      oldValue: 'f',
      newValue: 'ff',
      at: ['d', 'e', 'f'],
    }),
    jump(),
  ])

  const state = store.getState()
  expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b', 'cc'])
})

it('jump back to edit after indent', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
    editThought({
      oldValue: 'a',
      newValue: 'aa',
      at: ['a'],
    }),
    setCursor(['b']),
    indent(),
    jump(),
  ])

  const state = store.getState()
  expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['aa'])
})

it('jump twice after indent', () => {
  const store = createTestStore()

  store.dispatch([
    newThought({ value: '' }),
    editThought({
      oldValue: '',
      newValue: 'a',
      at: [''],
    }),
    newThought({ value: '' }),
    editThought({
      oldValue: '',
      newValue: 'b',
      at: [''],
    }),
    indent(),
    jump(),
    jump(),
  ])

  const state = store.getState()
  expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b'])
})

it('jump after new subthought', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - c
      `,
    }),
    setCursor(['a']),
    newSubthought(),
    editThought({
      oldValue: '',
      newValue: 'b',
      at: ['a', ''],
    }),
    setCursor(['c']),
    newSubthought(),
    editThought({
      oldValue: '',
      newValue: 'd',
      at: ['c', ''],
    }),
    jump(),
  ])

  const state = store.getState()
  expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b'])
})

it('jump from null cursor', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
    editThought({
      oldValue: 'a',
      newValue: 'aa',
      at: ['a'],
    }),
    setCursor(null),
    jump(),
  ])

  const state = store.getState()
  expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['aa'])
})
