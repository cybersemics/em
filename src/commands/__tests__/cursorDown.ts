import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand } from '../../commands'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorDownCommand from '../cursorDown'

// Disable animation frame throttling so each command executes synchronously and deterministically across tests.
vi.mock('../../util/throttleByAnimationFrame', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (f: (...args: any[]) => void) => f,
}))

beforeEach(initStore)

/** Synthetic Shift+Down keyboard event. */
const shiftDownEvent = { shiftKey: true, preventDefault: () => {} } as unknown as KeyboardEvent

/** Returns the sorted values of the current multicursor set. */
const multicursorValues = (): (string | undefined)[] => {
  const state = store.getState()
  return Object.values(state.multicursors)
    .map(path => headValue(state, path))
    .sort()
}

describe('cursorDown Shift+Down multiselect in table view second column', () => {
  it('extends the multiselect to the next col2 cell within the same cell', () => {
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

    executeCommand(cursorDownCommand, { store, event: shiftDownEvent })

    expect(multicursorValues()).toEqual(['d', 'e'])
  })

  it('extends the multiselect to the first col2 cell of the next row (cousin) when at the last cell', () => {
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

    executeCommand(cursorDownCommand, { store, event: shiftDownEvent })

    expect(multicursorValues()).toEqual(['e', 'f'])
  })

  it('does nothing at the last col2 cell of the last row', () => {
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
      setCursor(['a', 'r3', 'g']),
    ])

    executeCommand(cursorDownCommand, { store, event: shiftDownEvent })

    expect(multicursorValues()).toEqual([])
  })

  it('extends the multiselect to the next sibling in normal list view (no regression)', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['a']),
    ])

    executeCommand(cursorDownCommand, { store, event: shiftDownEvent })

    expect(multicursorValues()).toEqual(['a', 'b'])
  })
})
