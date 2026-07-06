import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import db from '../../data-providers/yjs/thoughtspace'
import { initialize } from '../../initialize'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import uncategorizeCommand from '../uncategorize'

beforeEach(initStore)

describe('uncategorize', () => {
  it('undoes uncategorize of a duplicate uncle', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
            - a
              - c
        `,
      }),
      setCursor(['b', 'a']),
    ])

    executeCommandWithMulticursor(uncategorizeCommand, { store })

    let state = store.getState()
    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
  - b
    - c`)
    expectPathToEqual(state, state.cursor, ['b', 'c'])

    expect(() => store.dispatch(undo())).not.toThrow()

    state = store.getState()
    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
  - b
    - a
      - c`)
    expectPathToEqual(state, state.cursor, ['b', 'a'])
  })

  it('pushes complete lexeme updates when undoing uncategorize of a duplicate uncle', async () => {
    const updateThoughtsSpy = vi.spyOn(db, 'updateThoughts').mockResolvedValue(undefined)

    try {
      store.dispatch([
        importText({
          text: `
            - a
            - b
              - a
                - c
          `,
        }),
        setCursor(['b', 'a']),
      ])

      executeCommandWithMulticursor(uncategorizeCommand, { store })
      store.dispatch(undo())

      await vi.runOnlyPendingTimersAsync()
      await Promise.resolve()

      const malformedLexemeUpdates = updateThoughtsSpy.mock.calls
        .flatMap(([payload]) => Object.values(payload.lexemeIndexUpdates))
        .filter(lexeme => lexeme && !Array.isArray(lexeme.contexts))

      expect(malformedLexemeUpdates).toEqual([])
    } finally {
      updateThoughtsSpy.mockRestore()
    }
  })

  it('persists undoing uncategorize of a duplicate uncle without a save error', async () => {
    const { cleanup } = await initialize()

    try {
      store.dispatch([
        importText({
          text: `
            - a
            - b
              - a
                - c
          `,
        }),
        setCursor(['b', 'a']),
      ])

      executeCommandWithMulticursor(uncategorizeCommand, { store })
      store.dispatch(undo())

      await vi.runOnlyPendingTimersAsync()
      await Promise.resolve()

      expect(store.getState().alert?.value).not.toContain('not able to save the last change')
    } finally {
      cleanup()
    }
  }, 10000)

  describe('multicursor', () => {
    it('collapses multiple thoughts', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - a1
              - a2
            - b
              - b1
              - b2
            - c
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
      ])

      executeCommandWithMulticursor(uncategorizeCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a1
  - a2
  - b1
  - b2
  - c`

      expect(exported).toEqual(expectedOutput)
    })

    it('collapses thoughts at different levels', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - b
                - b1
                - b2
              - c
                - c1
                - c2
            - d
              - e
                - e1
                - e2
          `,
        }),
        setCursor(['a', 'b']),
        addMulticursor(['a', 'b']),
        addMulticursor(['d', 'e']),
      ])

      executeCommandWithMulticursor(uncategorizeCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b1
    - b2
    - c
      - c1
      - c2
  - d
    - e1
    - e2`

      expect(exported).toEqual(expectedOutput)
    })

    it('does not collapse thoughts without children', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - a1
            - b
            - c
              - c1
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(uncategorizeCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a1
  - b
  - c1`

      expect(exported).toEqual(expectedOutput)
    })

    it('collapses nested thoughts correctly', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - b
                - c
                  - d
            - e
              - f
                - g
          `,
        }),
        setCursor(['a', 'b']),
        addMulticursor(['a', 'b']),
        addMulticursor(['e', 'f']),
      ])

      executeCommandWithMulticursor(uncategorizeCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - c
      - d
  - e
    - g`

      expect(exported).toEqual(expectedOutput)
    })
  })
})
