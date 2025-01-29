import { deleteThoughtActionCreator as deleteThought } from '../../actions/deleteThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { indentActionCreator as indent } from '../../actions/indent'
import { jumpActionCreator as jump } from '../../actions/jump'
import { newSubthoughtActionCreator as newSubthought } from '../../actions/newSubthought'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import store from '../../stores/app'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import pathToContext from '../../util/pathToContext'

/**
 * Use fake timers to ensure that cursor scrolling helpers complete.
 */
beforeEach(() => {
  vi.useFakeTimers()
  initStore()
})
afterEach(vi.useRealTimers)

describe('jump history', () => {
  it('add edited path to jump history', () => {
    store.dispatch([
      importText({
        text: `
        - a
          - x
        - b
          - y
      `,
      }),
      setCursor(['a', 'x']),
      editThought(['a', 'x'], 'xx'),
    ])

    const state = store.getState()

    expect(pathToContext(state, state.jumpHistory[0]!)).toEqual(['a', 'xx'])
  })

  it('navigaton does not push to jump history', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b
        - c
      `,
      }),
      setCursor(['a']),
      editThought(['a'], 'aa'),
    ])

    const stateA = store.getState()
    expect(pathToContext(stateA, stateA.jumpHistory[0]!)).toEqual(['aa'])

    store.dispatch(setCursor(['b']))

    const stateB = store.getState()
    expect(pathToContext(stateB, stateB.jumpHistory[0]!)).toEqual(['aa'])
    expect(stateA.jumpHistory.length).toEqual(stateB.jumpHistory.length)
  })

  it('replace last jump when editing a sibling', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b
        - c
      `,
      }),
      setCursor(['a']),
      editThought(['a'], 'aa'),
    ])

    const stateA = store.getState()
    expect(pathToContext(stateA, stateA.jumpHistory[0]!)).toEqual(['aa'])

    store.dispatch([setCursor(['b']), editThought(['b'], 'bb')])

    // the jump point is now bb, but the total number of jumps stayed the same
    const stateB = store.getState()
    expect(pathToContext(stateB, stateB.jumpHistory[0]!)).toEqual(['bb'])
    expect(stateA.jumpHistory.length).toEqual(stateB.jumpHistory.length)
  })

  it('replace last jump when editing a child', () => {
    store.dispatch([
      importText({
        text: `
        - a
          - b
      `,
      }),
      setCursor(['a']),
      editThought(['a'], 'aa'),
    ])

    const stateA = store.getState()

    store.dispatch([setCursor(['aa', 'b']), editThought(['aa', 'b'], 'bb')])

    const stateB = store.getState()
    expect(pathToContext(stateB, stateB.jumpHistory[0]!)).toEqual(['aa', 'bb'])
    expect(stateA.jumpHistory.length).toEqual(stateB.jumpHistory.length)
  })

  // TODO: We should probably merge ancestors.
  it('do not merge ancestors (?)', () => {
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
      setCursor(['a', 'b', 'c', 'd', 'e', 'f']),
      editThought(['a', 'b', 'c', 'd', 'e', 'f'], 'ff'),
    ])

    const state = store.getState()
    expect(pathToContext(state, state.jumpHistory[0]!)).toEqual(['a', 'b', 'c', 'd', 'e', 'ff'])
    expect(pathToContext(state, state.jumpHistory[1]!)).toEqual(['a'])
  })
})

describe('jump back', () => {
  it('jump back to the last edit point', () => {
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
      editThought(['a', 'b', 'c'], 'cc'),
      setCursor(['d', 'e', 'f']),
      editThought(['d', 'e', 'f'], 'ff'),
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b', 'cc'])
  })

  it('replace the last jump point when editing its parent', () => {
    store.dispatch([
      importText({
        text: `
        - x
          - y
        - a
          - b
            - c
            - d
            - e
        - f
          - g
            - h
      `,
      }),
      // edit y (first edit point)
      setCursor(['x']),
      setCursor(['x', 'y']),
      editThought(['x', 'y'], 'yy'),
      // edit c (second edit point)
      setCursor(['a']),
      setCursor(['a', 'b', 'c']),
      editThought(['a', 'b', 'c'], 'cc'),
      // edit b (overrides the second edit point)
      setCursor(['a', 'b']),
      editThought(['a', 'b'], 'bb'),
      // edit h (third edit point)
      setCursor(['a']),
      setCursor(['f']),
      setCursor(['f', 'g', 'h']),
      editThought(['f', 'g', 'h'], 'hh'),
      jump(-1),
    ])

    // jump batck to the updated second edit point
    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'bb'])

    // jump back to the first edit point
    store.dispatch(jump(-1))
    const state2 = store.getState()
    expect(state2.cursor && pathToContext(state2, state2.cursor)).toEqual(['x', 'yy'])
  })

  it('replace the last jump point when editing its child', () => {
    store.dispatch([
      importText({
        text: `
        - x
          - y
        - a
          - b
            - c
            - d
            - e
        - f
          - g
            - h
      `,
      }),
      // edit y (first edit point)
      setCursor(['x']),
      setCursor(['x', 'y']),
      editThought(['x', 'y'], 'yy'),
      // edit c (second edit point)
      setCursor(['a']),
      setCursor(['a', 'b', 'c']),
      editThought(['a', 'b', 'c'], 'cc'),
      // edit b (overrides the second edit point)
      setCursor(['a', 'b']),
      editThought(['a', 'b'], 'bb'),
      // edit h (third edit point)
      setCursor(['a']),
      setCursor(['f']),
      setCursor(['f', 'g', 'h']),
      editThought(['f', 'g', 'h'], 'hh'),
      jump(-1),
    ])

    // jump batck to the updated second edit point
    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'bb'])

    // jump back to the first edit point
    store.dispatch(jump(-1))
    const state2 = store.getState()
    expect(state2.cursor && pathToContext(state2, state2.cursor)).toEqual(['x', 'yy'])
  })

  it('replace the last jump point when editing its sibling', () => {
    store.dispatch([
      importText({
        text: `
        - x
          - y
        - a
          - b
            - c
            - d
            - e
        - f
          - g
            - h
      `,
      }),
      // edit y (first edit point)
      setCursor(['x']),
      setCursor(['x', 'y']),
      editThought(['x', 'y'], 'yy'),
      // edit c (second edit point)
      setCursor(['a']),
      setCursor(['a', 'b', 'c']),
      editThought(['a', 'b', 'c'], 'cc'),
      // edit d (overrides the second edit point)
      setCursor(['a', 'b', 'd']),
      editThought(['a', 'b', 'd'], 'dd'),
      // edit e (overrides the second edit point)
      setCursor(['a', 'b', 'e']),
      editThought(['a', 'b', 'e'], 'ee'),
      // edit h (third edit point)
      setCursor(['a']),
      setCursor(['f']),
      setCursor(['f', 'g', 'h']),
      editThought(['f', 'g', 'h'], 'hh'),
      jump(-1),
    ])

    // jump batck to the updated second edit point
    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b', 'ee'])

    // jump back to the first edit point
    store.dispatch(jump(-1))
    const state2 = store.getState()
    expect(state2.cursor && pathToContext(state2, state2.cursor)).toEqual(['x', 'yy'])
  })

  it('jump back to edit after indent', () => {
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
      setCursor(['a']),
      setCursor(['a', 'b']),
      editThought(['a', 'b'], 'bb'),
      setCursor(['c']),
      setCursor(['c', 'e']),
      indent(),
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'bb'])
  })

  it('jump back after new subthought', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - c
      `,
      }),
      setCursor(['a']),
      newSubthought(),
      editThought(['a', ''], 'b'),
      setCursor(['c']),
      newSubthought(),
      editThought(['c', ''], 'd'),
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b'])
  })

  it('jump back to edit after delete', () => {
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
      // edit a/b/c
      setCursor(['a', 'b', 'c']),
      editThought(['a', 'b', 'c'], 'cc'),
      // delete d/e/f
      setCursor(['d', 'e', 'f']),
      (dispatch, getState) => {
        const state = getState()
        dispatch(
          deleteThought({
            pathParent: state.cursor!,
            thoughtId: head(state.cursor!),
          }),
        )
      },
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b', 'cc'])
  })

  it('jump back to parent of delete', () => {
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
      // delete d/e/f
      setCursor(['d', 'e', 'f']),
      (dispatch, getState) => {
        const state = getState()
        dispatch(
          deleteThought({
            pathParent: state.cursor!,
            thoughtId: head(state.cursor!),
          }),
        )
      },
      // edit a/b/c
      setCursor(['a', 'b', 'c']),
      editThought(['a', 'b', 'c'], 'cc'),
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['d', 'e'])
  })

  it('jump back from null cursor', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b
      `,
      }),
      setCursor(['a']),
      editThought(['a'], 'aa'),
      setCursor(null),
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['aa'])
  })
})

describe('jump forward', () => {
  it('jump back then forward should restore the cursor to where it was before jump back', () => {
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
      editThought(['b'], 'bb'),
      setCursor(['d']),
      editThought(['d'], 'dd'),
      jump(-1),
      jump(1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['dd'])
  })

  it('jump back then forward then back should be equivalent to a single jump back', () => {
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
      // edit a/b/c
      setCursor(['a']),
      setCursor(['a', 'b', 'c']),
      editThought(['a', 'b', 'c'], 'cc'),
      // edit d/e/f
      setCursor(['a']),
      setCursor(['d']),
      setCursor(['d', 'e', 'f']),
      editThought(['d', 'e', 'f'], 'ff'),
      // jump back to a/b/cc
      jump(-1),
      // jump forward to d/e/ff
      jump(1),
      // jump back to a/b/cc
      jump(-1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b', 'cc'])
  })

  it('jump back then forward after indent', () => {
    store.dispatch([
      newThought({ value: '' }),
      editThought([''], 'a'),
      newThought({ value: '' }),
      editThought([''], 'b'),
      indent(),
      jump(-1),
      jump(1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['a', 'b'])
  })

  it('do nothing if jump back was not activated', () => {
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
      editThought(['b'], 'bb'),
      setCursor(['d']),
      editThought(['d'], 'dd'),
      jump(1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['dd'])
  })

  it('do nothing if already on most recent edit', () => {
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
      editThought(['b'], 'bb'),
      setCursor(['d']),
      editThought(['d'], 'dd'),
      jump(-1),
      jump(1),
      jump(1),
      jump(1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['dd'])
  })

  it('ignore jump back if already back to the beginning', () => {
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
      editThought(['b'], 'bb'),
      setCursor(['d']),
      editThought(['d'], 'dd'),
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

  it('jump forward to parent after delete', () => {
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
      // edit a/b/c
      setCursor(['a', 'b', 'c']),
      editThought(['a', 'b', 'c'], 'cc'),
      // delete d/e/f
      setCursor(['d', 'e', 'f']),
      (dispatch, getState) => {
        const state = getState()
        dispatch(
          deleteThought({
            pathParent: state.cursor!,
            thoughtId: head(state.cursor!),
          }),
        )
      },
      jump(-1),
      jump(1),
    ])

    const state = store.getState()
    expect(state.cursor && pathToContext(state, state.cursor)).toEqual(['d', 'e'])
  })
})
