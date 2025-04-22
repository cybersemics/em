import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import newThoughtCommand from '../newThought'

beforeEach(initStore)

describe('multicursor', () => {
  it('create a new thought after the last multicursor', () => {
    store.dispatch([
      importText({
        text: `
            - a
            - b
            - c
            - d
            - e
          `,
      }),
      setCursor(['c']),
      addMulticursor(['c']),
      addMulticursor(['d']),
    ])

    executeCommandWithMulticursor(newThoughtCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
  - b
  - c
  - d
  - ${''}
  - e`)

    // expect multicursor to be cleared
    expect(hasMulticursor(state)).toBeFalse()

    // expect cursor to be on the new thought
    expectPathToEqual(state, state.cursor, [''])
  })
})
