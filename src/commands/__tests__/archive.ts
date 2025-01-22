import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import archiveCommand from '../archive'

describe('archive', () => {
  describe('multicursor', () => {
    it('archives multiple thoughts', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
            - d
          `,
        }),
        setCursor(['b']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(archiveCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - =archive
    - c
    - b
  - a
  - d`

      expect(exported).toEqual(expectedOutput)
    })

    it('archives thoughts at different levels', async () => {
      const store = createTestStore()

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
        addMulticursor(['d', 'f']),
      ])

      executeCommandWithMulticursor(archiveCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - =archive
      - b
    - c
  - d
    - =archive
      - f
    - e`

      expect(exported).toEqual(expectedOutput)
    })

    it('does not archive read-only thoughts', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
              - =readonly
            - b
            - c
              - =readonly
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(archiveCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - =readonly
  - b
  - c
    - =readonly`

      expect(exported).toEqual(expectedOutput)
    })

    it('permanently deletes thoughts that are already archived', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
            - b
            - =archive
              - x
              - y
          `,
        }),
        setCursor(['=archive', 'x']),
        addMulticursor(['=archive', 'x']),
        addMulticursor(['=archive', 'y']),
      ])

      executeCommandWithMulticursor(archiveCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - =archive`

      expect(exported).toEqual(expectedOutput)
    })

    it('archives empty thoughts with descendants', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
            - 
              - b
            - c
              - 
                - d
          `,
        }),
        setCursor(['']),
        addMulticursor(['']),
        addMulticursor(['c', '']),
      ])

      executeCommandWithMulticursor(archiveCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - =archive
    - ${'' /* prevent trim_trailing_whitespace */}
      - b
  - a
  - c
    - =archive
      - ${'' /* prevent trim_trailing_whitespace */}
        - d`

      expect(exported).toEqual(expectedOutput)
    })
  })
})
