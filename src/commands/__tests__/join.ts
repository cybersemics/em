import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import joinShortcut from '../join'

describe('join', () => {
  describe('multicursor', () => {
    it('join multiple selected thoughts', () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - x
              - a
              - b
              - c
              - d
              - e
          `,
        }),
        setCursor(['x', 'b']),
        addMulticursor(['x', 'b']),
        addMulticursor(['x', 'c']),
        addMulticursor(['x', 'd']),
      ])

      executeCommandWithMulticursor(joinShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - x
    - a
    - b c d
    - e`

      expect(exported).toEqual(expectedOutput)
    })
  })
})
