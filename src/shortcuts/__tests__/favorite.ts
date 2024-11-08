import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import executeShortcut, { executeShortcutWithMulticursor } from '../../util/executeShortcut'
import favorite from '../favorite'

describe('favorite', () => {
  it('adds a thought to favorites', () => {
    const store = createTestStore()

    store.dispatch([newThought({ value: 'A' }), setCursor(['A'])])

    executeShortcut(favorite, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutput = `- ${HOME_TOKEN}
  - A
    - =favorite`

    expect(exported).toEqual(expectedOutput)
  })

  it('removes a thought from favorites', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - A
            - =favorite
        `,
      }),
      setCursor(['A']),
    ])

    executeShortcut(favorite, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutput = `- ${HOME_TOKEN}
  - A`

    expect(exported).toEqual(expectedOutput)
  })

  describe('multicursor', () => {
    it('adds multiple thoughts to favorites', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - A
            - B
            - C
          `,
        }),
        setCursor(['A']),
        addMulticursor(['B']),
      ])

      executeShortcutWithMulticursor(favorite, { store })

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
      const store = createTestStore()

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
        addMulticursor(['B']),
      ])

      executeShortcutWithMulticursor(favorite, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      const expectedOutput = `- ${HOME_TOKEN}
  - A
  - B
  - C
    - =favorite`

      expect(exported).toEqual(expectedOutput)
    })

    it('handles mixed scenarios correctly', async () => {
      const store = createTestStore()

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
        addMulticursor(['B']),
        addMulticursor(['C']),
      ])

      executeShortcutWithMulticursor(favorite, { store })

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
