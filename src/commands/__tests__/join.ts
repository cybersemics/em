import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import joinCommand from '../join'

beforeEach(initStore)

describe('join', () => {
  describe('multicursor', () => {
    it('join multiple selected thoughts', () => {
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

      executeCommandWithMulticursor(joinCommand, { store })

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
