import { archiveThoughtActionCreator as archiveThought } from '../../actions/archiveThought'
import { clearActionCreator as clear } from '../../actions/clear'
import { cursorBackActionCreator as cursorBack } from '../../actions/cursorBack'
import { cursorDownActionCreator as cursorDown } from '../../actions/cursorDown'
import { editThoughtActionCreator as editThoughtRaw } from '../../actions/editThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { indentActionCreator as indent } from '../../actions/indent'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../../actions/moveThoughtDown'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { redoActionCreator as redo } from '../../actions/redo'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import moveThoughtDownCommand from '../../commands/moveThoughtDown'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import isUndoEnabled from '../../selectors/isUndoEnabled'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import archiveCommand from '../archive'
import deleteCommand from '../delete'
import indentCommand from '../indent'
import moveCursorForward from '../moveCursorForward'

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

  it('undo should stay enabled and not throw after a multicursor command that nets to no change', () => {
    store.dispatch([
      importText({
        text: `
        - a
        - b
        - c
        - d`,
      }),
      // Select b, c, and d.
      setCursor(['b']),
      addMulticursor(['b']),
      addMulticursor(['c']),
      addMulticursor(['d']),
    ])

    // Indent the selected thoughts under a. This is the undoable change that must remain undoable after the subsequent no-op command.
    executeCommandWithMulticursor(moveCursorForward, { store })

    let exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
    - c
    - d`)

    expect(isUndoEnabled(store.getState())).toBe(true)

    // Execute a multicursor command that nets to no change. The space-to-indent guard bails on the non-empty thoughts, so indent dispatches nothing, but the surrounding setIsMulticursorExecuting actions still run.
    // Previously this appended an empty patch to undoPatches, which disabled Undo and threw on the next undo/redo.
    executeCommandWithMulticursor(indentCommand, { store, type: 'keyboard' })

    // Structure is unchanged by the no-op command.
    exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
    - c
    - d`)

    // Undo must remain enabled (the no-op command must not push an empty patch that disables undo).
    expect(isUndoEnabled(store.getState())).toBe(true)

    // Undo must not throw and should restore the pre-indent structure.
    expect(() => store.dispatch(undo())).not.toThrow()

    exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
  - b
  - c
  - d`)

    // Redo must not throw and should restore the indented structure.
    expect(() => store.dispatch(redo())).not.toThrow()

    exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
    - c
    - d`)
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
      editThought(['a', 'b'], 'b1'),
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
      editThought(['d'], 'd1'),
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

  it('formatting edits should not be grouped with newThought on undo', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      newThought({ value: 'c' }),
      newThought({ value: 'd' }),
      editThought(['d'], 'd1'),
      editThought(['d1'], '<b>d1</b>'),
    ])

    // verify the bold formatting was applied before undo
    const exportedBeforeUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedBeforeUndo).toContain('<li><b>d1</b></li>')

    // undo should only revert the formatting, not the content edit or the newThought
    store.dispatch(undo())

    // formatting undone; verify the bold is gone but thought still exists with plain text value
    const exportedAfterUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedAfterUndo).not.toContain('<b>')
    expect(exportedAfterUndo).toContain('<li>d1</li>')

    // a second undo reverts the content edit, but grouped with preceding newThought → thought deleted
    store.dispatch(undo())
    const exportedSecond = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exportedSecond).toEqual(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
  })

  it('multiple consecutive formatting edits should each be a separate undo step', () => {
    store.dispatch([
      importText({
        text: `
          - a`,
      }),
      // content edit: 'a' → 'hello'
      editThought(['a'], 'hello'),
      // first formatting-only edit: plain → bold
      editThought(['hello'], '<b>hello</b>'),
      // second formatting-only edit: bold → bold+italic (context must match the current thought value)
      editThought(['<b>hello</b>'], '<b><i>hello</i></b>'),
    ])

    // verify bold+italic was applied
    const exportedBeforeUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedBeforeUndo).toContain('<li><b><i>hello</i></b></li>')

    // first undo should only revert the italic (second formatting edit)
    store.dispatch(undo())
    const exportedAfterFirstUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedAfterFirstUndo).toContain('<li><b>hello</b></li>')

    // second undo should only revert the bold (first formatting edit)
    store.dispatch(undo())
    const exportedAfterSecondUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedAfterSecondUndo).toContain('<li>hello</li>')
    expect(exportedAfterSecondUndo).not.toContain('<b>')
  })

  it('formatting edit applied directly after newThought should not delete the thought on undo', () => {
    store.dispatch([
      importText({
        text: `
          - a`,
      }),
      newThought({ value: 'hello' }),
    ])
    // formatting-only edit: no content edit between newThought and formatting
    store.dispatch(editThought(['hello'], '<b>hello</b>'))

    // undo should only revert the formatting, not delete the thought (newThought is penultimate)
    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exported).not.toContain('<b>')
    expect(exported).toContain('<li>hello</li>')
  })

  it('applying formatting after undoing a formatting edit should not delete the thought on the next undo', () => {
    store.dispatch([
      importText({
        text: `
          - a`,
      }),
      // content edit: 'a' → 'hello'
      editThought(['a'], 'hello'),
      // formatting-only edit: plain → bold
      editThought(['hello'], '<b>hello</b>'),
    ])

    // undo the bold formatting
    store.dispatch(undo())
    const exportedAfterUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedAfterUndo).toContain('<li>hello</li>')
    expect(exportedAfterUndo).not.toContain('<b>')

    // apply a different formatting after the undo (e.g. italic)
    store.dispatch(editThought(['hello'], '<i>hello</i>'))

    // verify italic was applied
    const exportedAfterReformat = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedAfterReformat).toContain('<li><i>hello</i></li>')

    // undo the italic — should only revert the formatting, thought must still exist
    store.dispatch(undo())
    const exportedAfterSecondUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedAfterSecondUndo).toContain('<li>hello</li>')
    expect(exportedAfterSecondUndo).not.toContain('<i>')
  })

  it('background highlight (foreColor+backColor) should be a single undo step', () => {
    // Simulates the ColorPicker background highlight flow: foreColor (black text) + backColor (orange bg).
    // These are two separate editThought dispatches but should merge into one undo step via mergePrev.
    // Without mergePrev, undoing only reverts the backColor, leaving black text on dark background (invisible).
    store.dispatch([
      importText({
        text: `
          - hello`,
      }),
      // foreColor: set text to black (first formatting dispatch)
      editThought(['hello'], '<font color="#000000">hello</font>'),
    ])

    // backColor: set background to orange (second formatting dispatch, with mergePrev: true)
    // Computed synchronously using the current store state to avoid a thunk dispatch
    const pathAfterForeColor = contextToPath(store.getState(), ['<font color="#000000">hello</font>'])
    store.dispatch(
      editThoughtRaw({
        path: pathAfterForeColor!,
        oldValue: head(pathAfterForeColor! as string[]),
        newValue: '<font color="#000000" style="background-color: rgb(255, 165, 0);">hello</font>',
        mergePrev: true,
      }),
    )

    // undo should revert both foreColor and backColor in a single step, restoring the plain value
    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    // Both formatting changes are undone — plain text is restored (not stuck with black text on dark bg)
    expect(exported).toContain('<li>hello</li>')
    expect(exported).not.toContain('<font')
  })

  it('applying font color over background color should be a single undo step', () => {
    // Simulates ColorPicker.toggleTextColor when applying a text color over a thought with a background color.
    // Three separate editThought dispatches occur:
    //   1. foreColor('green') → via Editable: editThought (no mergePrev)
    //   2. backColor('bg') → via Editable: editThought (mergePrev=true via batchEditing)
    //   3. cleanup dispatch in formatSelection → editThought (mergePrev=true via batchEditing, fixed by this PR)
    // All three should merge into a single undo step so that undo reverts to the original red background.
    const redBg = '<span style="background-color: rgb(255,0,0)">hello</span>'
    const withGreenAndRedBg = '<span style="background-color: rgb(255,0,0)"><font color="#008000">hello</font></span>'
    const withGreenAndDefaultBg =
      '<span style="background-color: rgb(51,51,51)"><font color="#008000">hello</font></span>'
    const withGreenOnly = '<font color="#008000">hello</font>'

    store.dispatch([
      importText({
        text: `
          - hello`,
      }),
      // simulate existing red background applied to the thought
      editThought(['hello'], redBg),
    ])

    // Step 1: foreColor('green') via Editable (no mergePrev)
    const pathAfterRedBg = contextToPath(store.getState(), [redBg])
    store.dispatch(
      editThoughtRaw({
        path: pathAfterRedBg!,
        oldValue: redBg,
        newValue: withGreenAndRedBg,
      }),
    )

    // Step 2: backColor('bg') via Editable flush (mergePrev=true from batchEditing)
    const pathAfterGreenFore = contextToPath(store.getState(), [withGreenAndRedBg])
    store.dispatch(
      editThoughtRaw({
        path: pathAfterGreenFore!,
        oldValue: withGreenAndRedBg,
        newValue: withGreenAndDefaultBg,
        mergePrev: true,
      }),
    )

    // Step 3: cleanup dispatch in formatSelection (mergePrev=batchEditing=true after fix)
    const pathAfterBackColor = contextToPath(store.getState(), [withGreenAndDefaultBg])
    store.dispatch(
      editThoughtRaw({
        path: pathAfterBackColor!,
        oldValue: withGreenAndDefaultBg,
        newValue: withGreenOnly,
        mergePrev: true,
      }),
    )

    // undo should revert all three steps in one go, restoring the red-background-only state
    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    // font color is reverted; red background is restored
    expect(exported).toContain('<li>' + redBg + '</li>')
    expect(exported).not.toContain('#008000')
  })

  it('undoing a formatting edit should preserve trailing space in thought value', () => {
    // Issue F: applying formatting to a thought with a trailing space was stripping the space on undo
    // because trimHtml previously stripped whitespace inside closing tags (e.g. "<b>hello </b>" → "<b>hello</b>").
    store.dispatch([
      importText({
        text: `
          - a`,
      }),
      // content edit: 'a' → 'hello ' (with trailing space)
      editThought(['a'], 'hello '),
      // formatting-only edit: preserve the trailing space inside the bold tag
      editThought(['hello '], '<b>hello </b>'),
    ])

    // verify the bold with trailing space was applied
    const exportedBeforeUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedBeforeUndo).toContain('<li><b>hello </b></li>')

    // undo should revert the formatting and restore "hello " (with trailing space)
    store.dispatch(undo())
    const exportedAfterUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exportedAfterUndo).not.toContain('<b>')
    expect(exportedAfterUndo).toContain('<li>hello </li>')
  })

  it('letter case edit directly after newThought should not delete the thought on undo', () => {
    // Issue J: applying letter case (e.g. UpperCase) directly after creating a thought caused undoTwice
    // to fire because the case change was not recognized as a formatting edit.
    store.dispatch([
      importText({
        text: `
          - a`,
      }),
      newThought({ value: 'hello' }),
    ])
    // letter case edit: no content edit between newThought and letter case
    store.dispatch(editThought(['hello'], 'HELLO'))

    // first undo should only revert the case change, not delete the thought
    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toContain('hello')
    expect(exported).not.toContain('HELLO')
  })

  it('undo letter case should not move caret to the beginning of the thought', () => {
    // Issue K: after undoing a letter case change, the caret was moving to position 0.
    // Root cause: formatLetterCase dispatched a separate setCursor action, creating a navigation
    // patch that triggered undoTwice, restoring cursorOffset to the pre-setCursor value (0 on
    // desktop when editingValueStore is non-null from a prior edit).
    // Fix: formatLetterCase now passes cursorOffset directly to editThought (matching formatWithTag),
    // and undoReducer preserves the current cursorOffset when undoing a formatting-only edit.
    store.dispatch([importText({ text: `- hello` }), setCursor(['hello'])])

    const path = contextToPath(store.getState(), ['hello'])!

    // Simulate formatLetterCase (after fix): editThought with cursorOffset set to actual position (5).
    store.dispatch(
      editThoughtRaw({
        oldValue: 'hello',
        newValue: 'HELLO',
        path: path!,
        cursorOffset: 5,
        force: true,
      }),
    )

    expect(store.getState().cursorOffset).toBe(5)

    // Undo should revert the value but preserve cursorOffset at 5 (not revert it to the pre-edit value).
    store.dispatch(undo())

    expect(store.getState().cursorOffset).toBe(5)

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toContain('hello')
    expect(exported).not.toContain('HELLO')
  })

  it('undo of a force formatting edit should increment editableNonce so the ContentEditable re-renders', () => {
    // Issue K ("nothing happens after undo"): editThought with force:true bumps editableNonce, and that bump
    // was captured in the undo patch. Undoing reverted the nonce and editableRender then re-incremented it to
    // the same value, resulting in no net change. Since the ContentEditable only updates its innerHTML on a
    // nonce change while editing (allowInnerHTMLChange is false after typing), the reverted value was never
    // rendered and the formatted text appeared unchanged after undo.
    // Fix: editableNonce is excluded from undo/redo patches, so undoing a force edit yields a true net increment.
    store.dispatch([importText({ text: `- hello` }), setCursor(['hello'])])

    const path = contextToPath(store.getState(), ['hello'])!

    store.dispatch(
      editThoughtRaw({
        oldValue: 'hello',
        newValue: 'HELLO',
        path: path!,
        force: true,
      }),
    )

    const nonceBeforeUndo = store.getState().editableNonce

    store.dispatch(undo())

    // the nonce must strictly increase so the ContentEditable re-renders the reverted value
    expect(store.getState().editableNonce).toBeGreaterThan(nonceBeforeUndo)

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toContain('hello')
    expect(exported).not.toContain('HELLO')
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
      editThought(['a', 'b'], 'bd'),
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

  it('should undo a multicursor command and a trailing navigation action together in a single undo', () => {
    // Reproduces #4314: archiving multiple selected thoughts via the DropGutter while the Command Center is open
    // leaves a trailing setCursor (navigation) patch on top of the multicursor command patch. The multicursor
    // command patch stores its undoLabel (here the command id 'archive', which is not a registered action type) at
    // actions[0], so the first undo must still restore the archived thoughts, not just the trailing cursor change.
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

    // Archive all selected thoughts as a single multicursor command. The cursor lands on the surviving sibling d.
    executeCommandWithMulticursor(archiveCommand, { store })

    // The archived thoughts (a, b, c) are moved to the hidden =archive context.
    let exportedTrailingNav = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exportedTrailingNav).toEqual(`- ${HOME_TOKEN}
  - =archive
    - c
    - b
    - a
  - d
  - e`)

    // Simulate the trailing navigation patch that lands on top of the command patch (e.g. cursor restore after the
    // Command Center closes). Moving the cursor to a different surviving thought creates a separate navigation-only patch.
    store.dispatch(setCursor(['e']))

    // A single undo must undo both the trailing navigation and the multicursor command, restoring the archived thoughts.
    store.dispatch(undo())

    exportedTrailingNav = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exportedTrailingNav).toEqual(`- ${HOME_TOKEN}
  - a
  - b
  - c
  - d
  - e`)
  })
})
