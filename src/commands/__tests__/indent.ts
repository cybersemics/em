import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import indentShortcut from '../indent'

describe('indent', () => {
  describe('multicursor', () => {
    it('indents multiple thoughts', async () => {
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

      executeCommandWithMulticursor(indentShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
  - d`

      expect(exported).toEqual(expectedOutput)
    })

    it('indents thoughts at different levels', async () => {
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
        addMulticursor(['d', 'f']),
      ])

      executeCommandWithMulticursor(indentShortcut, { store })

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

    it('does not indent all thoughts on the same level', () => {
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

      executeCommandWithMulticursor(indentShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
  - d`

      expect(exported).toEqual(expectedOutput)
    })

    it('indents parent/child thoughts', () => {
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
        setCursor(['c']),
        addMulticursor(['c', 'd']),
        addMulticursor(['e']),
      ])

      executeCommandWithMulticursor(indentShortcut, { store })

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
