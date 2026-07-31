import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import swapNoteCommand from '../swapNote'

beforeEach(initStore)

/** Returns the sorted values of the current multicursor set. */
const multicursorValues = (): (string | undefined)[] => {
  const state = store.getState()
  return Object.values(state.multicursors)
    .map(path => headValue(state, path))
    .sort()
}

describe('swapNote', () => {
  it('converts a thought to a note', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
        `,
      }),
      setCursor(['a', 'b']),
    ])

    executeCommand(swapNoteCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - =note
      - b`)
  })

  it('converts a note back to a thought', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - =note
              - b
          - c
        `,
      }),
      setCursor(['a']),
    ])

    executeCommand(swapNoteCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - b
  - c`)
  })

  describe('multicursor', () => {
    it('converts multiple thoughts to notes', async () => {
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
        setCursor(['a', 'b']),
        addMulticursor(['a', 'b']),
        addMulticursor(['e', 'f']),
      ])

      executeCommandWithMulticursor(swapNoteCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
    - =note
      - b
  - c
    - d
  - e
    - =note
      - f`)
    })

    it('moves the multiselect and cursor to the non-attribute parents when thoughts are converted to notes', () => {
      store.dispatch([
        importText({
          text: `
            - a
              - =view
                - Table
              - b
                - c
              - d
                - e
          `,
        }),
        setCursor(['a', 'd', 'e']),
        addMulticursor(['a', 'b', 'c']),
        addMulticursor(['a', 'd', 'e']),
      ])

      executeCommandWithMulticursor(swapNoteCommand, { store })

      // c and e have been moved into their parents' =note attribute, so the
      // multiselect and cursor should move up to the nearest non-attribute ancestors.
      expect(multicursorValues()).toEqual(['b', 'd'])
      expect(headValue(store.getState(), store.getState().cursor!)).toBe('d')
    })
  })
})
