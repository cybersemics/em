import cursorPrev from '../../action-creators/cursorPrev'
import importText from '../../action-creators/importText'
import toggleAttribute from '../../action-creators/toggleAttribute'
import globals from '../../globals'
import contextToPath from '../../selectors/contextToPath'
import { createTestStore } from '../../test-helpers/createTestStore'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

describe('normal view', () => {
  it('move cursor to previous sibling', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
        - a
          - a1
        - b`,
      }),
      setCursor(['b']),
      cursorPrev(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a'])
  })

  it('move to first root child when there is no cursor', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursor(null),
      cursorPrev(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a'])
  })

  it('do nothing when the cursor on the first sibling', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursor(['a']),
      cursorPrev(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a'])
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
            values: ['=sort', 'Alphabetical'],
          }),
        ),
      setCursor(['SORT', 'c']),
      cursorPrev(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['SORT', 'b'])
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
      setCursor(['a', 'd']),
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
      setCursor(['a', 'd']),
      cursorPrev(),
    ])

    expect(globals.suppressExpansion).toBe(false)
  })

  it('do not activate suppress expansion on cursorPrev if new cursor parent has pinned children', async () => {
    const text = `
    - a
      - =children
        - =pin
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
      setCursor(['a', 'd']),
      cursorPrev(),
    ])

    expect(globals.suppressExpansion).toBe(false)
  })
})
