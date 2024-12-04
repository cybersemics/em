import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import outdentShortcut from '../outdent'

describe('outdent', () => {
  describe('multicursor', () => {
    it('outdents multiple thoughts', async () => {
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
        setCursor(['a', 'b']),
        addMulticursor(['a', 'c']),
      ])

      executeCommandWithMulticursor(outdentShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - c
  - d`

      expect(exported).toEqual(expectedOutput)
    })

    it('outdents thoughts at different levels', async () => {
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
        setCursor(['a', 'b', 'c']),
        addMulticursor(['d', 'e', 'f']),
      ])

      executeCommandWithMulticursor(outdentShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
  - d
    - e
    - f`

      expect(exported).toEqual(expectedOutput)
    })

    it('does not outdent thoughts already at the root level', () => {
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
        setCursor(['a', 'b']),
        addMulticursor(['a', 'c']),
      ])

      executeCommandWithMulticursor(outdentShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - c
  - d`

      expect(exported).toEqual(expectedOutput)
    })

    it('outdents parent/child thoughts', () => {
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
        setCursor(['a', 'c']),
        addMulticursor(['a', 'c', 'd']),
        addMulticursor(['a', 'e']),
      ])

      executeCommandWithMulticursor(outdentShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
  - c
    - d
  - e
    - f`

      expect(exported).toEqual(expectedOutput)
    })
  })
})
