import cursorPrev from '../../action-creators/cursorPrev'
import importText from '../../action-creators/importText'
import setCursor from '../../action-creators/setCursor'
import { createTestStore } from '../../test-helpers/createTestStore'
import setCursorFirstMatch, { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import globals from '../../globals'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToPath from '../../selectors/contextToPath'
import toggleAttribute from '../../action-creators/toggleAttribute'

describe('normal view', () => {
  it('move cursor to previous sibling', () => {
    const store = createTestStore()

    store.dispatch(
      importText({
        text: `
        - a
          - a1
        - b`,
      }),
    )

    setCursorFirstMatch(['b'])(store.getState())
    store.dispatch(cursorPrev())

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'a' }])
  })

  it('move to first root child when there is no cursor', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursor({ path: null }),
      cursorPrev(),
    ])

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'a' }])
  })

  it('do nothing when the cursor on the first sibling', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursorFirstMatchActionCreator(['a']),
      cursorPrev(),
    ])

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'a' }])
  })

  it('do nothing when there are no thoughts', () => {
    const store = createTestStore()

    store.dispatch(cursorPrev())

    expect(store.getState().cursor).toBe(null)
  })

  it('sorted thoughts', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - SORT
            - a
            - c
            - b
              - b1`,
      }),
      (dispatch, getState) =>
        dispatch(
          toggleAttribute({
            path: contextToPath(getState(), ['SORT']),
            key: '=sort',
            value: 'Alphabetical',
          }),
        ),
      setCursorFirstMatchActionCreator(['SORT', 'c']),
      cursorPrev(),
    ])

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'SORT' }, { value: 'b' }])
  })

  it('skip descendants', () => {
    const store = createTestStore()

    store.dispatch(
      importText({
        text: `
          - a
            - a1
          - b`,
      }),
    )
    setCursorFirstMatch(['b'])(store.getState())
    store.dispatch(cursorPrev())

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'a' }])
  })
})

describe('global suppress expansion', () => {
  beforeEach(() => {
    globals.suppressExpansion = false
  })

  it('suppress expansion path on cursor prev', async () => {
    const text = `
    - a
      - c
        - k
      - d
        - e
        - f`

    jest.useFakeTimers()
    const store = createTestStore()

    store.dispatch([
      importText({
        text,
      }),
      setCursorFirstMatchActionCreator(['a', 'd']),
      cursorPrev(),
    ])

    expect(globals.suppressExpansion).toBe(true)
  })

  it('do not activate suppress expansion on cursorPrev if new cursor is pinned', async () => {
    const text = `
    - a
      - c
        - =pin
          - true
        - k
      - d
        - e
        - f`

    jest.useFakeTimers()
    const store = createTestStore()

    store.dispatch([
      importText({
        text,
      }),
      setCursorFirstMatchActionCreator(['a', 'd']),
      cursorPrev(),
    ])

    expect(globals.suppressExpansion).toBe(false)
  })

  it('do not activate suppress expansion on cursorPrev if new cursor parent has pinned children', async () => {
    const text = `
    - a
      - =pinChildren
        - true
      - c
        - k
      - d
        - e
        - f`

    jest.useFakeTimers()
    const store = createTestStore()

    store.dispatch([
      importText({
        text,
      }),
      setCursorFirstMatchActionCreator(['a', 'd']),
      cursorPrev(),
    ])

    expect(globals.suppressExpansion).toBe(false)
  })
})
