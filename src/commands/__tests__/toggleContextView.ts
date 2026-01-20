import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import toggleContextViewCommand from '../toggleContextView'

beforeEach(initStore)

describe('toggleContextView', () => {
  describe('multicursor', () => {
    it('toggles context view for multiple thoughts', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - m
                - x
            - b
              - m
                - y
          `,
        }),
        setCursor(['a', 'm']),
        addMulticursor(['a', 'm']),
        addMulticursor(['b', 'm']),
      ])

      executeCommandWithMulticursor(toggleContextViewCommand, { store })

      const stateNew = store.getState()

      const am = contextToPath(stateNew, ['a', 'm'])
      const bm = contextToPath(stateNew, ['b', 'm'])

      expect(stateNew.contextViews).toEqual({
        [hashPath(am)]: true,
        [hashPath(bm)]: true,
      })
    })
  })
})
