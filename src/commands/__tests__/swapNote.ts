import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import executeCommand, { executeCommandWithMulticursor } from '../../util/executeCommand'
import swapNoteShortcut from '../swapNote'

describe('swapNote', () => {
  it('converts a thought to a note', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
            - b
        `,
      }),
      setCursor(['a', 'b']),
    ])

    executeCommand(swapNoteShortcut, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - =note
      - b`)
  })

  it('converts a note back to a thought', () => {
    const store = createTestStore()

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

    executeCommand(swapNoteShortcut, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - b
  - c`)
  })

  describe('multicursor', () => {
    it('converts multiple thoughts to notes', async () => {
      const store = createTestStore()

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
        addMulticursor(['e', 'f']),
      ])

      executeCommandWithMulticursor(swapNoteShortcut, { store })

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
  })
})
