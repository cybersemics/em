import { archiveThoughtActionCreator as archiveThought } from '../../actions/archiveThought'
import { clearActionCreator as clear } from '../../actions/clear'
import { cursorBackActionCreator as cursorBack } from '../../actions/cursorBack'
import { cursorDownActionCreator as cursorDown } from '../../actions/cursorDown'
import { importTextActionCreator as importText } from '../../actions/importText'
import { indentActionCreator as indent } from '../../actions/indent'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../../actions/moveThoughtDown'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import moveThoughtDownCommand from '../../commands/moveThoughtDown'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import deleteCommand from '../delete'
import indentCommand from '../indent'

beforeEach(initStore)

/******************************************************************
 * UNDO
 ******************************************************************/

/**
 * This was originally combined with the 'undo' tests but, for some reason, if it doesn't
 * run first then there are errors, likely related to some state remaining in the store
 * from previous tests.
 */
describe('undo persistence', () => {
  it('persists undo thought change', async () => {
    await initialize()

    store.dispatch([
      importText({
        text: `
        - a
        - b`,
      }),
      setCursor(['a']),
      newThought({ value: 'alpha', insertNewSubthought: true }),
      undo(),
    ])

    // clear and call initialize again to reload from local db (simulating page refresh)
    store.dispatch(clear())

    await initialize()
    await vi.runAllTimersAsync()

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b`

    expect(exported).toEqual(expectedOutput)

    await vi.runAllTimersAsync()
    vi.useRealTimers()
  }, 10000 /* increase timeout to give time for two calls to initialize() */)
})

describe('undo', () => {
  it('undo edit', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b`,
      }),
      setCursor(['a']),
      editThought(['a'], 'aa'),
      undo(),
    ])

    const stateNew = store.getState()
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b`

    expect(exported).toEqual(expectedOutput)

    // TODO: This does not seem to properly test restorePushQueueFromPatches.
    // It passes even when the Lexeme is set to null.
    // It was only noticed because of the Lexeme data integrity check added to updateThoughts.
    // See: undoRedoEnhancer commit on 7/2/22
    const lexemeA = getLexeme(stateNew, 'a')
    expect(lexemeA).toBeTruthy()

    const lexemeAA = getLexeme(stateNew, 'aa')
    expect(lexemeAA).toBeFalsy()
  })

  it('state remains unchanged if there is nothing to undo', () => {
    store.dispatch(
      importText({
        text: `
      - a
       - b
       - c
       - d`,
        preventSetCursor: true,
      }),
    )

    const prevState = store.getState()
    expect(prevState.undoPatches.length).toEqual(0)

    store.dispatch(undo())

    expect(store.getState()).toEqual(prevState)
  })

  it('ingore alerts', () => {
    store.dispatch([
      importText({
        text: `
          - A
          - B`,
      }),
      setCursor(['A']),
      archiveThought({}),
    ])
    const { undoPatches } = store.getState()
    const lastPatch = undoPatches[undoPatches.length - 1]

    const thoughtsExists = lastPatch.some(({ path }) => path.includes('/thoughts'))
    expect(thoughtsExists).toEqual(true)

    const alertExists = lastPatch.some(({ path }) => path.includes('/alert'))
    expect(alertExists).toEqual(false)
  })

  it('non-undoable actions are ignored', () => {
    store.dispatch([{ type: 'search', value: 'New' }, { type: 'showModal', id: 'welcome' }, { type: 'toggleSidebar' }])

    expect(store.getState().undoPatches.length).toEqual(0)
  })

  it('undo importText', () => {
    store.dispatch([
      newThought({}),
      importText({
        text: `
        - A
        - B`,
      }),
      undo(),
    ])

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}`)
  })

  it('cursor should restore to same thought if the thought has been edited after undo', () => {
    store.dispatch([
      newThought({}),
      setCursor(['']),
      editThought([''], 'a'),
      newThought({}),
      setCursor(['']),
      editThought([''], 'b'),
      setCursor(['a']),
      editThought(['a'], 'aa'),
      undo(),
    ])

    const expectedCursor = [{ value: 'a', rank: 0 }]

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject(expectedCursor)
  })

  it('cursor should restore correctly after undo archive', async () => {
    await initialize()

    store.dispatch([newThought({ value: 'a' }), setCursor(['a']), { type: 'archiveThought' }, undo()])

    const stateNew = store.getState()
    const expectedCursor = [{ value: 'a', rank: 0 }]

    const cursorThoughts = stateNew.cursor && childIdsToThoughts(stateNew, stateNew.cursor)

    expect(cursorThoughts).toMatchObject(expectedCursor)
  })

  it('undo should restore all thoughts after a multicursor moveThoughtDown operation', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b
        - c
        - d
        - e`,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    // Execute moveThoughtDown on all selected thoughts
    executeCommandWithMulticursor(moveThoughtDownCommand, { store })

    // Check intermediate state after moveThoughtDown but before undo
    // This verifies that all three thoughts were moved down correctly
    let exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    let expectedOutput = `- ${HOME_TOKEN}
  - d
  - a
  - b
  - c
  - e`
    expect(exported).toEqual(expectedOutput)

    // Now perform one undo operation
    store.dispatch(undo())

    exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - c
  - d
  - e`
    expect(exported).toEqual(expectedOutput)
  })

  // Broken when space-to-indent was added.
  // This test relies on multicursor across levels which will be disallowed soon, so it will need to be updaded anyway.
  // indentCommand and moveCursorForwar should probably be combined as well.
  it.skip('undo should restore complex multicursor operations involving multiple command types', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b
        - c
        - d
        - e
        - f
        - g`,
      }),
      // Select multiple thoughts
      setCursor(['b']),
      addMulticursor(['b']),
      addMulticursor(['c']),
      addMulticursor(['d']),
    ])

    // Execute moveCursorForward on selected thoughts
    executeCommandWithMulticursor(indentCommand, { store })

    // Check intermediate state after indent
    let exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    let expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
    - d
  - e
  - f
  - g`
    expect(exported).toEqual(expectedOutput)

    // Select different thoughts for deletion
    store.dispatch([setCursor(['f']), addMulticursor(['f']), addMulticursor(['g'])])

    executeCommandWithMulticursor(deleteCommand, { store })

    // Check intermediate state after deletion
    exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
    - d
  - e`
    expect(exported).toEqual(expectedOutput)

    // Single undo should restore the deletion
    store.dispatch(undo())

    exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
    - d
  - e
  - f
  - g`
    expect(exported).toEqual(expectedOutput)

    // Second undo should restore the indent
    store.dispatch(undo())

    exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - c
  - d
  - e
  - f
  - g`
    expect(exported).toEqual(expectedOutput)
  })
})

/******************************************************************
 * REDO
 ******************************************************************/

describe('redo', () => {
  it('redo edit', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b`,
      }),
      setCursor(['a']),
      editThought(['a'], 'aa'),
      undo(),
      { type: 'redo' },
    ])

    const stateNew = store.getState()
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - aa
  - b`)

    const lexemeAA = getLexeme(stateNew, 'aa')
    expect(lexemeAA).toBeTruthy()

    const lexemeA = getLexeme(stateNew, 'a')
    expect(lexemeA).toBeFalsy()
  })

  it('redo importText', () => {
    store.dispatch([
      newThought({}),
      importText({
        text: `
        - A
        - B`,
      }),
      undo(),
    ])

    // redo thought change
    store.dispatch({ type: 'redo' })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - ${''}
  - A
  - B`)
  })

  it('clear redo history after a new action is taken', () => {
    store.dispatch([
      importText({
        text: `
        - A
        - B`,
        preventSetCursor: true,
      }),
      editThought(['A'], 'Atlantic'),
      { type: 'newThought', value: 'New Jersey' },
      undo(),
      undo(),
    ])

    expect(store.getState().redoPatches.length).toEqual(2)

    // dispatch an undoable action
    store.dispatch(newThought({ value: 'Atlantic City' }))

    expect(store.getState().redoPatches.length).toEqual(0)
  })
})

/******************************************************************
 * GROUPING - Some actions are grouped together into a single undo step.
 ******************************************************************/

describe('grouping', () => {
  it('group all navigation actions following an undoable(non-navigation) action and undo them together', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b
        - c
        - d`,
      }),
      setCursor(['b']),
      indent(),
      editThought(['a', 'b'], 'b1', { rankInContext: 0 }),
      cursorBack(),
      moveThoughtDown(),
      cursorDown(),
      setCursor(['a', 'b1']),
      // undo 'moveThoughtDown', 'cursorDown' and 'setCursor'
      undo(),
    ])

    const cursorAfterFirstUndo = childIdsToThoughts(store.getState(), store.getState().cursor!)
    expect(cursorAfterFirstUndo).toMatchObject([{ value: 'a' }])

    const exportedAfterFirstUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutputAfterFirstUndo = `- ${HOME_TOKEN}
  - a
    - b1
  - c
  - d`

    expect(exportedAfterFirstUndo).toEqual(expectedOutputAfterFirstUndo)
    // undo 'cursorBack' and 'editThought'
    store.dispatch(undo())

    const cursorAfterSecondUndo = childIdsToThoughts(store.getState(), store.getState().cursor!)
    expect(cursorAfterSecondUndo).toMatchObject([{ value: 'a' }, { value: 'b' }])

    const exportedAfterSecondUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutputAfterSecondUndo = `- ${HOME_TOKEN}
  - a
    - b
  - c
  - d`

    expect(exportedAfterSecondUndo).toEqual(expectedOutputAfterSecondUndo)
  })

  it('newThought action should be grouped with the succeeding patch', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      newThought({ value: 'c' }),
      newThought({ value: 'd' }),
      editThought(['d'], 'd1', { rankInContext: 3 }),
      // undo thought change and preceding newThought action
      undo(),
    ])

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - c`

    expect(exported).toEqual(expectedOutput)
  })

  it('contiguous edits should be grouped', () => {
    store.dispatch([
      importText({
        text: `
        - A
        - B`,
      }),
      editThought(['A'], 'Atlantic'),
      editThought(['Atlantic'], 'Atlantic City'),
      undo(),
    ])

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - A
  - B`

    expect(exported).toEqual(expectedOutput)
  })

  it('contiguous edit additions should should not be grouped with deletions', () => {
    store.dispatch([
      importText({
        text: `
        - hello`,
      }),
      editThought(['hello'], 'hello world'),
      editThought(['hello world'], 'hello'),
      editThought(['hello'], 'hello universe'),
      undo(),
    ])

    const exportedThirdEdit = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exportedThirdEdit).toEqual(`- ${HOME_TOKEN}
  - hello`)

    store.dispatch(undo())

    const exportedSecondEdit = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exportedSecondEdit).toEqual(`- ${HOME_TOKEN}
  - hello world`)

    store.dispatch(undo())

    const exportedFirstEdit = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exportedFirstEdit).toEqual(`- ${HOME_TOKEN}
  - hello`)
  })

  it('ignore dead actions and combine dispensible actions with the preceding patch', () => {
    store.dispatch([
      importText({
        text: `
        - a
          - b
          - c
          - d`,
      }),
      setCursor(null),
      editThought(['a', 'b'], 'bd', { rankInContext: 0 }),
      // dispensible set cursor (which only updates datanonce)
      setCursor(null),
      // undo setCursor and thoughtChange in a sinle action
      undo(),
    ])

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
    - d`

    expect(exported).toEqual(expectedOutput)
  })
})

describe('multicursor grouping', () => {
  it('should undo/redo all multicursor actions in a single step', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b
        - c
        - d
        - x`,
      }),
      // Add a a penultimate action to ensure that it doesn't get grouped with the multicursor.
      // Otherwise undoTwice will not be under test coverage and there can be a false positive.
      editThought(['x'], 'e'),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    // Execute moveThoughtDown on all selected thoughts
    executeCommandWithMulticursor(moveThoughtDownCommand, { store })

    // Verify thoughts are moved
    let exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    let expectedOutput = `- ${HOME_TOKEN}
  - d
  - a
  - b
  - c
  - e`
    expect(exported).toEqual(expectedOutput)

    // Undo the multicursor operation
    store.dispatch(undo())

    // Verify thoughts are back to original state
    exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - c
  - d
  - e`
    expect(exported).toEqual(expectedOutput)

    // Redo the multicursor operation
    store.dispatch({ type: 'redo' })

    // Verify thoughts are moved again
    exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expectedOutput = `- ${HOME_TOKEN}
  - d
  - a
  - b
  - c
  - e`
    expect(exported).toEqual(expectedOutput)
  })
})
