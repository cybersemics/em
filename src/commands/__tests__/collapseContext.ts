import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import collapseContextCommand from '../collapseContext'

describe('collapseContext', () => {
  describe('multicursor', () => {
    it('collapses multiple thoughts', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
              - a1
              - a2
            - b
              - b1
              - b2
            - c
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
      ])

      executeCommandWithMulticursor(collapseContextCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a1
  - a2
  - b1
  - b2
  - c`

      expect(exported).toEqual(expectedOutput)
    })

    it('collapses thoughts at different levels', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
              - b
                - b1
                - b2
              - c
                - c1
                - c2
            - d
              - e
                - e1
                - e2
          `,
        }),
        setCursor(['a', 'b']),
        addMulticursor(['a', 'b']),
        addMulticursor(['d', 'e']),
      ])

      executeCommandWithMulticursor(collapseContextCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b1
    - b2
    - c
      - c1
      - c2
  - d
    - e1
    - e2`

      expect(exported).toEqual(expectedOutput)
    })

    it('does not collapse thoughts without children', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
              - a1
            - b
            - c
              - c1
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(collapseContextCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a1
  - b
  - c1`

      expect(exported).toEqual(expectedOutput)
    })

    it('collapses nested thoughts correctly', async () => {
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
                - g
          `,
        }),
        setCursor(['a', 'b']),
        addMulticursor(['a', 'b']),
        addMulticursor(['e', 'f']),
      ])

      executeCommandWithMulticursor(collapseContextCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - c
      - d
  - e
    - g`

      expect(exported).toEqual(expectedOutput)
    })
  })
})
