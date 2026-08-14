import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import noteCommand from '../note'

beforeEach(initStore)

/** Returns the sorted values of the current multicursor set. */
const multicursorValues = (): (string | undefined)[] => {
  const state = store.getState()
  return Object.values(state.multicursors)
    .map(path => headValue(state, path))
    .sort()
}

describe('note', () => {
  it('creates an empty note on the cursor thought and focuses it', () => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
    ])

    executeCommandWithMulticursor(noteCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - =note
      - `)

    expect(store.getState().noteFocus).toBe(true)
  })

  it('removes an empty note when the note is focused', () => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
    ])

    // the first execution creates an empty note and focuses it; the second deletes the still-empty note
    executeCommandWithMulticursor(noteCommand, { store })
    executeCommandWithMulticursor(noteCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a`)

    expect(store.getState().noteFocus).toBe(false)
  })

  describe('multicursor', () => {
    it('creates a note on each selected thought', () => {
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
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(noteCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - =note
      - 
  - b
    - =note
      - 
  - c
    - =note
      - `)
    })

    it('creates notes only on the thoughts without notes on a mixed selection', () => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
              - =note
                - hello
            - c
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(noteCommand, { store })

      // a and c gain empty notes, while b keeps its existing note untouched
      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - =note
      - 
  - b
    - =note
      - hello
  - c
    - =note
      - `)
    })

    it('places the caret in the note of the last selected thought in document order', () => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        // select c before a to ensure the final cursor follows document order rather than selection order
        setCursor(['c']),
        addMulticursor(['c']),
        addMulticursor(['a']),
      ])

      executeCommandWithMulticursor(noteCommand, { store })

      const state = store.getState()

      expectPathToEqual(state, state.cursor, ['c'])
      expect(state.noteFocus).toBe(true)
      expect(multicursorValues()).toEqual(['a', 'c'])
    })

    it('creates and focuses a note on a single selected thought like direct execution', () => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
      ])

      executeCommandWithMulticursor(noteCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - =note
      - 
  - b`)

      const state = store.getState()

      expectPathToEqual(state, state.cursor, ['a'])
      expect(state.noteFocus).toBe(true)
      expect(multicursorValues()).toEqual(['a'])
    })

    it('reverts every created note on a single undo', () => {
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
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(noteCommand, { store })

      // Precondition: all three notes were created, otherwise the undo below would have nothing to revert.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - =note
      - 
  - b
    - =note
      - 
  - c
    - =note
      - `)

      store.dispatch(undo())

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
    })
  })
})
