import { cursorNextActionCreator as cursorNext } from '../../actions/cursorNext'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleAttributeActionCreator as toggleAttribute } from '../../actions/toggleAttribute'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import globals from '../../globals'
import contextToPath from '../../selectors/contextToPath'
import { createTestStore } from '../../test-helpers/createTestStore'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

describe('normal view', () => {
  it('move cursor to next sibling', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
            - a1
          - b`,
      }),
      setCursor(['a']),
      cursorNext(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['b'])
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
      cursorNext(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a'])
  })

  it('do nothing when the cursor on the last sibling', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursor(['b']),
      cursorNext(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['b'])
  })

  it('do nothing when there are no thoughts', () => {
    const store = createTestStore()

    store.dispatch(cursorNext())

    expect(store.getState().cursor).toBe(null)
  })

  it('sorted thoughts', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - SORT
            - a
              - a1
            - c
            - b`,
      }),
      (dispatch, getState) =>
        dispatch(
          toggleAttribute({
            path: contextToPath(getState(), ['SORT']),
            values: ['=sort', 'Alphabetical'],
          }),
        ),
      setCursor(['SORT', 'a']),
      cursorNext(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['SORT', 'b'])
  })

  it('skip descendants', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
            - a1
          - b`,
      }),
      setCursor(['a']),
      cursorNext(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['b'])
  })
})

describe('context view', () => {
  it('move cursor to next context', () => {
    const store = createTestStore()

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
      cursorNext(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'b'])
  })

  it('noop if on last context', () => {
    const store = createTestStore()

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
      cursorNext(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'b'])
  })
})

describe('global suppress expansion', () => {
  beforeEach(() => {
    globals.suppressExpansion = false
  })

  it('suppress expansion path on cursorNext', async () => {
    const text = `
    - a
      - d
        - k
      - c
        - e
        - f`

    const store = createTestStore()

    store.dispatch([
      importText({
        text,
      }),
      setCursor(['a', 'd']),
      cursorNext(),
    ])

    expect(globals.suppressExpansion).toBe(true)
  })

  it('do not activate suppress expansion on cursorNext if new cursor is pinned', async () => {
    const text = `
    - a
      - d
        - k
      - c
        - =pin
          - true
        - e
        - f`

    const store = createTestStore()

    store.dispatch([
      importText({
        text,
      }),
      setCursor(['a', 'd']),
      cursorNext(),
    ])

    expect(globals.suppressExpansion).toBe(false)
  })

  it('do not activate suppress expansion on cursorNext if new cursor parent has pinned children', async () => {
    const text = `
    - a
      - =children
        - =pin
          - true
      - d
        - k
      - c
        - e
        - f`

    const store = createTestStore()

    store.dispatch([
      importText({
        text,
      }),
      setCursor(['a', 'd']),
      cursorNext(),
    ])

    expect(globals.suppressExpansion).toBe(false)
  })
})
