import importText from '../../action-creators/importText'
import indent from '../../action-creators/indent'
import jump from '../../action-creators/jump'
import newSubthought from '../../action-creators/newSubthought'
import newThought from '../../action-creators/newThought'
import { createTestStore } from '../../test-helpers/createTestStore'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pathToContext from '../../util/pathToContext'

describe('jump back', () => {
  it('jump back to the last edit point', () => {
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
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['bb'])
  })

  it('jump back to last edit point in deeply nested thoughts', () => {
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
      jump(-1),
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
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['aa'])
  })

  it('jump back after new subthought', () => {
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
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b'])
  })

  it('jump back from null cursor', () => {
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
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['aa'])
  })
})

describe('jump forward', () => {
  it('jump back then forward should restore the cursor to where it was before jump back', () => {
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
      jump(-1),
      jump(1),
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
      jump(-1),
      jump(1),
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['bb'])
  })

  it('jump back then forward after indent', () => {
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
      jump(-1),
      jump(1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b'])
  })

  it('do nothing if jump back was not activated', () => {
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
      jump(1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['dd'])
  })

  it('do nothing if already on most recent edit', () => {
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
      jump(-1),
      jump(1),
      jump(1),
      jump(1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['dd'])
  })

  it('ignore jump back if already back to the beginning', () => {
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
      jump(-1),
      jump(-1),
      jump(-1),
      jump(-1),
      jump(-1),
      jump(1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['dd'])
  })
})
