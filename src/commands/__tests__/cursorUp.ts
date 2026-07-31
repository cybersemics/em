import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand } from '../../commands'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursorAtFirstMatch } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import headValue from '../../util/headValue'
import cursorUpCommand from '../cursorUp'

// Disable animation frame throttling so each command executes synchronously and deterministically across tests.
vi.mock('../../util/throttleByAnimationFrame', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (f: (...args: any[]) => void) => f,
}))

beforeEach(initStore)

/** Synthetic Shift+Up keyboard event. */
const shiftUpEvent = { shiftKey: true, preventDefault: () => {} } as unknown as KeyboardEvent

/** Synthetic Up keyboard event (no shift). */
const upEvent = { shiftKey: false, preventDefault: () => {} } as unknown as KeyboardEvent

/** Returns the sorted values of the current multicursor set. */
const multicursorValues = (): (string | undefined)[] => {
  const state = store.getState()
  return Object.values(state.multicursors)
    .map(path => headValue(state, path))
    .sort()
}

describe('cursorUp Shift+Up multiselect in table view second column', () => {
  it('extends the multiselect to the previous col2 cell within the same cell', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - =view
              - Table
            - r1
              - b
              - c
            - r2
              - d
              - e
            - r3
              - f
              - g
        `,
      }),
      setCursor(['a', 'r2', 'e']),
    ])

    executeCommand(cursorUpCommand, { store, event: shiftUpEvent })

    expect(multicursorValues()).toEqual(['d', 'e'])
  })

  it('extends the multiselect to the last col2 cell of the previous row (cousin) when at the first cell', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - =view
              - Table
            - r1
              - b
              - c
            - r2
              - d
              - e
            - r3
              - f
              - g
        `,
      }),
      setCursor(['a', 'r2', 'd']),
    ])

    executeCommand(cursorUpCommand, { store, event: shiftUpEvent })

    expect(multicursorValues()).toEqual(['c', 'd'])
  })

  it('does nothing at the first col2 cell of the first row', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - =view
              - Table
            - r1
              - b
              - c
            - r2
              - d
              - e
            - r3
              - f
              - g
        `,
      }),
      setCursor(['a', 'r1', 'b']),
    ])

    executeCommand(cursorUpCommand, { store, event: shiftUpEvent })

    expect(multicursorValues()).toEqual([])
  })

  it('extends the multiselect to the previous sibling in normal list view (no regression)', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['b']),
    ])

    executeCommand(cursorUpCommand, { store, event: shiftUpEvent })

    expect(multicursorValues()).toEqual(['a', 'b'])
  })

  // https://github.com/cybersemics/em/issues/4738
  it('does not expand the thought the multiselect is extended onto', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - x
          - b
          - c
        `,
      }),
      setCursor(['c']),
    ])

    executeCommand(cursorUpCommand, { store, event: shiftUpEvent })
    executeCommand(cursorUpCommand, { store, event: shiftUpEvent })

    const state = store.getState()
    const pathA = contextToPath(state, ['a'])!

    expect(multicursorValues()).toEqual(['a', 'b', 'c'])
    // a is selected, so its subthought x must stay collapsed
    expect(state.expanded[hashPath(pathA)]).toBeUndefined()
  })
})

describe('cursorUp Up (no shift) with an active multiselect', () => {
  // https://github.com/cybersemics/em/issues/4741
  it('collapses the multiselect and moves the cursor to the first selected thought in document order', () => {
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
      // place the cursor away from the selection to prove the target is the first selected thought, not relative to the cursor
      setCursor(['e']),
      addMulticursorAtFirstMatch(['b']),
      addMulticursorAtFirstMatch(['c']),
      addMulticursorAtFirstMatch(['d']),
    ])

    executeCommand(cursorUpCommand, { store, event: upEvent })

    const state = store.getState()
    expect(state.cursor && headValue(state, state.cursor)).toBe('b')
    expect(state.multicursors).toEqual({})
  })
})
