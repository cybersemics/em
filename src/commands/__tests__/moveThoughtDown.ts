import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import moveThoughtDownShortcut from '../moveThoughtDown'

describe('moveThoughtDown', () => {
  it('moves a single thought down', () => {
    const store = createTestStore()

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

    executeCommandWithMulticursor(moveThoughtDownShortcut, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
  - c
  - b`)
  })

  describe('multicursor', () => {
    it('moves multiple thoughts down', async () => {
      const store = createTestStore()

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
        addMulticursor(['d']),
      ])

      executeCommandWithMulticursor(moveThoughtDownShortcut, { store })

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
      const store = createTestStore()

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
        addMulticursor(['b']),
        addMulticursor(['c', 'c2']),
      ])

      executeCommandWithMulticursor(moveThoughtDownShortcut, { store })

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
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursor(['b']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(moveThoughtDownShortcut, { store })

      const state = store.getState()
      const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
  - b
  - c`)
    })
  })
})
