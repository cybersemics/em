import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import swapNoteCommand from '../swapNote'

beforeEach(initStore)

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
  })
})
