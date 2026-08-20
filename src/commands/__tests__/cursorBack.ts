import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursorAtFirstMatch } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorBackCommand from '../cursorBack'

// Disable animation frame throttling so the command executes synchronously and deterministically.
vi.mock('../../util/throttleByAnimationFrame', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (f: (...args: any[]) => void) => f,
}))

// The swipe gesture that activates Cursor Back is only available on touch devices.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

/** Returns the sorted values of the current multicursor set. */
const multicursorValues = (): (string | undefined)[] => {
  const state = store.getState()
  return Object.values(state.multicursors)
    .map(path => headValue(state, path))
    .sort()
}

describe('cursorBack', () => {
  // https://github.com/cybersemics/em/issues/3526
  it('selects the parents of the selected thoughts', () => {
    store.dispatch([
      importText({
        text: `
          - x
            - =children
              - =pin
            - a
              - b
              - c
            - d
              - e
            - f
              - g
        `,
      }),
      setCursor(['x', 'a', 'b']),
      addMulticursorAtFirstMatch(['x', 'a', 'b']),
      addMulticursorAtFirstMatch(['x', 'a', 'c']),
      addMulticursorAtFirstMatch(['x', 'd', 'e']),
    ])

    executeCommandWithMulticursor(cursorBackCommand, { store, type: 'gesture' })

    expect(multicursorValues()).toEqual(['a', 'd'])
  })

  it('deselects selected thoughts at the root level since they have no parent', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['a']),
      addMulticursorAtFirstMatch(['a']),
      addMulticursorAtFirstMatch(['b']),
    ])

    executeCommandWithMulticursor(cursorBackCommand, { store, type: 'gesture' })

    expect(multicursorValues()).toEqual([])
  })

  it('keeps a selected thought that is the parent of another selected thought selected', () => {
    store.dispatch([
      importText({
        text: `
          - x
            - a
              - b
        `,
      }),
      setCursor(['x', 'a']),
      addMulticursorAtFirstMatch(['x', 'a']),
      addMulticursorAtFirstMatch(['x', 'a', 'b']),
    ])

    executeCommandWithMulticursor(cursorBackCommand, { store, type: 'gesture' })

    expect(multicursorValues()).toEqual(['a', 'x'])
  })
})
