import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeShortcutWithMulticursor } from '../../util/executeShortcut'
import deleteShortcut from '../delete'

describe('delete', () => {
  describe('multicursor', () => {
    it('deletes multiple thoughts', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
            - d
          `,
        }),
        setCursor(['b']),
        addMulticursor(['c']),
      ])

      executeShortcutWithMulticursor(deleteShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
  - d`

      expect(exported).toEqual(expectedOutput)
    })

    it('deletes thoughts at different levels', async () => {
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
        addMulticursor(['d', 'f']),
      ])

      executeShortcutWithMulticursor(deleteShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - c
  - d
    - e`

      expect(exported).toEqual(expectedOutput)
    })

    it('does not delete read-only thoughts', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
              - =readonly
            - b
            - c
              - =readonly
          `,
        }),
        setCursor(['a']),
        addMulticursor(['c']),
      ])

      executeShortcutWithMulticursor(deleteShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - =readonly
  - b
  - c
    - =readonly`

      expect(exported).toEqual(expectedOutput)
    })
  })
})
