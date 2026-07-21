import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand } from '../../commands'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
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
})
