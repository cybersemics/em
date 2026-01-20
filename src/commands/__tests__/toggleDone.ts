import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import toggleDoneCommand from '../toggleDone'

beforeEach(initStore)

describe('toggleDone', () => {
  it('marks a thought as done', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c
        `,
      }),
      setCursor(['a', 'b']),
    ])

    executeCommand(toggleDoneCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - b
      - =done
    - c`)
  })

  it('unmarks a thought as done', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
              - =done
            - c
        `,
      }),
      setCursor(['a', 'b']),
    ])

    executeCommand(toggleDoneCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - b
    - c`)
  })

  describe('multicursor', () => {
    it('marks multiple thoughts as done', async () => {
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
        setCursor(['a', 'b']),
        addMulticursor(['a', 'b']),
        addMulticursor(['d', 'e']),
      ])

      executeCommandWithMulticursor(toggleDoneCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
    - b
      - =done
    - c
  - d
    - e
      - =done
    - f`)
    })

    it('handles mixed scenarios with done and not done thoughts', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - b
                - =done
              - c
            - d
              - e
              - f
                - =done
          `,
        }),
        setCursor(['a', 'b']),
        addMulticursor(['a', 'b']),
        addMulticursor(['d', 'e']),
        addMulticursor(['d', 'f']),
      ])

      executeCommandWithMulticursor(toggleDoneCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - a
    - b
    - c
  - d
    - e
      - =done
    - f`)
    })
  })
})
