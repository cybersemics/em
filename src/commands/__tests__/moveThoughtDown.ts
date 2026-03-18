import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import moveThoughtDownCommand from '../moveThoughtDown'

beforeEach(initStore)

describe('moveThoughtDown', () => {
  it('moves a single thought down', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['b']),
    ])

    executeCommandWithMulticursor(moveThoughtDownCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
  - c
  - b`)
  })

  describe('multicursor', () => {
    it('moves multiple thoughts down', async () => {
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
        setCursor(['b']),
        addMulticursor(['b']),
        addMulticursor(['d']),
      ])

      executeCommandWithMulticursor(moveThoughtDownCommand, { store })

      const state = store.getState()
      const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
  - c
  - b
  - e
  - d`)
    })

    it('handles mixed scenarios correctly', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - a1
              - a2
            - b
            - c
              - c1
              - c2
            - d
          `,
        }),
        setCursor(['a', 'a1']),
        addMulticursor(['a', 'a1']),
        addMulticursor(['b']),
        addMulticursor(['c', 'c2']),
      ])

      executeCommandWithMulticursor(moveThoughtDownCommand, { store })

      const state = store.getState()
      const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
    - a2
    - a1
  - c
    - c1
  - b
  - d
    - c2`)
    })

    it('does nothing if there is no next thought', () => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursor(['b']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(moveThoughtDownCommand, { store })

      const state = store.getState()
      const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
  - b
  - c`)
    })
  })
})
