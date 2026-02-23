import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import archiveCommand from '../archive'

describe('archive', () => {
  describe('multicursor', () => {
    beforeEach(initStore)

    it('archives multiple thoughts', async () => {
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

    // Regression test for #3780: archiving all siblings should move all to =archive.
    // The persistence aspect (thoughts surviving reload) is covered by manual QA,
    // as the root cause was a silent early return in updateThought (thoughtspace.ts)
    // when the Lexeme Y.Doc was not cached during parent-change writes.
    it('archives all thoughts when all siblings are selected', async () => {
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
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
        addMulticursor(['d']),
        addMulticursor(['e']),
      ])

      executeCommandWithMulticursor(archiveCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      const expectedOutput = `- ${HOME_TOKEN}
  - =archive
    - e
    - d
    - c
    - b
    - a`
      expect(exported).toEqual(expectedOutput)
    })
  })
})
