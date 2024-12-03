import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeShortcutWithMulticursor } from '../../util/executeShortcut'
import moveThoughtUpShortcut from '../moveThoughtUp'

describe('moveThoughtUp', () => {
  it('moves a single thought up', () => {
    const store = createTestStore()

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

    executeShortcutWithMulticursor(moveThoughtUpShortcut, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
  - c
  - b`)
  })

  describe('multicursor', () => {
    it('moves multiple thoughts up', async () => {
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
        setCursor(['c']),
        addMulticursor(['e']),
      ])

      executeShortcutWithMulticursor(moveThoughtUpShortcut, { store })

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
        setCursor(['a', 'a2']),
        addMulticursor(['c']),
        addMulticursor(['c', 'c2']),
      ])

      executeShortcutWithMulticursor(moveThoughtUpShortcut, { store })

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
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
          - a
          - b
          - c
        `,
        }),
        setCursor(['a']),
        addMulticursor(['b']),
      ])

      executeShortcutWithMulticursor(moveThoughtUpShortcut, { store })

      const state = store.getState()
      const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
  - b
  - c`)
    })
  })
})
