import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import moveThoughtUpCommand from '../moveThoughtUp'

beforeEach(initStore)

describe('moveThoughtUp', () => {
  it('moves a single thought up', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['c']),
    ])

    executeCommandWithMulticursor(moveThoughtUpCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
  - c
  - b`)
  })

  describe('multicursor', () => {
    it('moves multiple thoughts up', async () => {
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
        addMulticursor(['e']),
      ])

      executeCommandWithMulticursor(moveThoughtUpCommand, { store })

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
        setCursor(['a', 'a2']),
        addMulticursor(['a', 'a2']),
        addMulticursor(['c']),
        addMulticursor(['c', 'c2']),
      ])

      executeCommandWithMulticursor(moveThoughtUpCommand, { store })

      const state = store.getState()
      const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
    - a2
    - a1
  - c
    - c2
    - c1
  - b
  - d`)
    })

    it('does not move the first thought', () => {
      store.dispatch([
        importText({
          text: `
          - a
          - b
          - c
        `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
      ])

      executeCommandWithMulticursor(moveThoughtUpCommand, { store })

      const state = store.getState()
      const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
  - b
  - c`)
    })
  })
})
