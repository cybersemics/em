import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import favorite from '../favorite'

beforeEach(initStore)

describe('favorite', () => {
  it('adds a thought to favorites', () => {
    store.dispatch([newThought({ value: 'A' }), setCursor(['A'])])

    executeCommand(favorite, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutput = `- ${HOME_TOKEN}
  - A
    - =favorite`

    expect(exported).toEqual(expectedOutput)
  })

  it('removes a thought from favorites', () => {
    store.dispatch([
      importText({
        text: `
          - A
            - =favorite
        `,
      }),
      setCursor(['A']),
    ])

    executeCommand(favorite, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutput = `- ${HOME_TOKEN}
  - A`

    expect(exported).toEqual(expectedOutput)
  })

  describe('multicursor', () => {
    it('adds multiple thoughts to favorites', async () => {
      store.dispatch([
        importText({
          text: `
            - A
            - B
            - C
          `,
        }),
        setCursor(['A']),
        addMulticursor(['A']),
        addMulticursor(['B']),
      ])

      executeCommandWithMulticursor(favorite, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      const expectedOutput = `- ${HOME_TOKEN}
  - A
    - =favorite
  - B
    - =favorite
  - C`

      expect(exported).toEqual(expectedOutput)
    })

    it('removes multiple thoughts from favorites', async () => {
      store.dispatch([
        importText({
          text: `
            - A
              - =favorite
            - B
              - =favorite
            - C
              - =favorite
          `,
        }),
        setCursor(['A']),
        addMulticursor(['A']),
        addMulticursor(['B']),
      ])

      executeCommandWithMulticursor(favorite, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      const expectedOutput = `- ${HOME_TOKEN}
  - A
  - B
  - C
    - =favorite`

      expect(exported).toEqual(expectedOutput)
    })

    it('handles mixed scenarios correctly', async () => {
      store.dispatch([
        importText({
          text: `
            - A
            - B
              - =favorite
            - C
          `,
        }),
        setCursor(['A']),
        addMulticursor(['A']),
        addMulticursor(['B']),
        addMulticursor(['C']),
      ])

      executeCommandWithMulticursor(favorite, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      const expectedOutput = `- ${HOME_TOKEN}
  - A
    - =favorite
  - B
  - C
    - =favorite`

      expect(exported).toEqual(expectedOutput)
    })
  })
})
