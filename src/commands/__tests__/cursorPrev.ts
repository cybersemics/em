import { cursorPrevActionCreator as cursorPrev } from '../../actions/cursorPrev'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleAttributeActionCreator as toggleAttribute } from '../../actions/toggleAttribute'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import globals from '../../globals'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(initStore)

describe('normal view', () => {
  it('move cursor to previous sibling', () => {
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

  it('move to last root child when there is no cursor', () => {
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
    expectPathToEqual(stateNew, stateNew.cursor, ['b'])
  })

  it('do nothing when the cursor is on the first thought', () => {
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

  it('do nothing when the cursor is on the first sibling', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d`,
      }),
      setCursor(['c', 'd']),
      cursorPrev(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['c', 'd'])
  })

  it('do nothing when there are no thoughts', () => {
    store.dispatch(cursorPrev())

    expect(store.getState().cursor).toBe(null)
  })

  it('move to first sibling of next row in table view col2', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - =view
              - Table
            - b
              - b1
            - c
              - c1`,
      }),
      setCursor(['a', 'c', 'c1']),
      cursorPrev(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b', 'b1'])
  })

  it('sorted thoughts', () => {
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

describe('context view', () => {
  it('move cursor to prev context', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y`,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
      setCursor(['a', 'm', 'b']),
      cursorPrev(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'a'])
  })

  it('noop if on first context', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y`,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
      setCursor(['a', 'm', 'a']),
      cursorPrev(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'a'])
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
