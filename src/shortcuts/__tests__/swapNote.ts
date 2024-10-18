import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import executeShortcut, { executeShortcutWithMulticursor } from '../../util/executeShortcut'
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

    executeShortcut(swapNoteShortcut, { store })

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

    executeShortcut(swapNoteShortcut, { store })

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

      executeShortcutWithMulticursor(swapNoteShortcut, { store })

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
