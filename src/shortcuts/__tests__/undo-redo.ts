import { archiveThoughtActionCreator as archiveThought } from '../../actions/archiveThought'
import { clearActionCreator as clear } from '../../actions/clear'
import { cursorBackActionCreator as cursorBack } from '../../actions/cursorBack'
import { cursorDownActionCreator as cursorDown } from '../../actions/cursorDown'
import { importTextActionCreator as importText } from '../../actions/importText'
import { indentActionCreator as indent } from '../../actions/indent'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../../actions/moveThoughtDown'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import * as isUndoEnabledModule from '../../selectors/isUndoEnabled'
import appStore from '../../stores/app'
import { createMockStore } from '../../test-helpers/createMockStore'
import { createTestStore } from '../../test-helpers/createTestStore'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import testTimer from '../../test-helpers/testTimer'
import initialState from '../../util/initialState'
import undoShortcut from '../undo'

const timer = testTimer()

/******************************************************************
 * UNDO
 ******************************************************************/

describe('undo', () => {
  const isUndoEnabled = vi.spyOn(isUndoEnabledModule, 'isUndoEnabled')

  it('dispatches undo action on shortcut if undo is enabled', () => {
    // enable undo
    isUndoEnabled.mockReturnValue(true)

    const mockStore = createMockStore()
    const store = mockStore(initialState())

    executeShortcut(undoShortcut, { store })

    expect(store.getActions()).toEqual([
      {
        type: 'undo',
      },
    ])
  })

  it('does not dispatch an undo action if undo is disabled', () => {
    // disable undo
    isUndoEnabled.mockImplementationOnce(() => false)

    const mockStore = createMockStore()
    const store = mockStore(initialState())

    executeShortcut(undoShortcut, { store })

    expect(store.getActions()).toEqual([])
  })

  it('undo edit', () => {
    const store = createTestStore()

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
    const store = createTestStore()

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
    const store = createTestStore()

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
    const store = createTestStore()
    store.dispatch([{ type: 'search', value: 'New' }, { type: 'showModal', id: 'welcome' }, { type: 'toggleSidebar' }])

    expect(store.getState().undoPatches.length).toEqual(0)
  })

  it('undo importText', () => {
    const store = createTestStore()

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
    const store = createTestStore()

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

  // TODO: Cursor is null in test, but correct when testing manually
  it.skip('cursor should restore correctly after undo archive', async () => {
    timer.useFakeTimer()
    initialize()
    await timer.runAllAsync()

    appStore.dispatch([newThought({ value: 'a' }), setCursor(['a']), { type: 'archiveThought' }, undo()])
    await timer.runAllAsync()

    timer.useRealTimer()

    const stateNew = appStore.getState()
    const expectedCursor = [{ value: 'a', rank: 0 }]

    const cursorThoughts = stateNew.cursor && childIdsToThoughts(stateNew, stateNew.cursor)

    expect(cursorThoughts).toMatchObject(expectedCursor)
  })

  // TODO
  it.skip('persists undo thought change', async () => {
    /**
     * Note: we can't use await with initialize as that results in a timeout error. It's handled using the usetestTimer from Sinon.
     * More on that here - https://github.com/cybersemics/em/issues/919#issuecomment-739135971.
     */
    initialize()

    timer.useFakeTimer()

    appStore.dispatch([
      importText({
        text: `
        - a
        - b`,
      }),
      setCursor(['a']),
      newThought({ value: 'alpha', insertNewSubthought: true }),
      undo(),
    ])
    await timer.runAllAsync()

    timer.useRealTimer()

    // clear and call initialize again to reload from local db (simulating page refresh)
    appStore.dispatch(clear())
    timer.useFakeTimer()
    initialize()
    await timer.runAllAsync()

    const exported = exportContext(appStore.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b`

    expect(exported).toEqual(expectedOutput)
  })
})

/******************************************************************
 * REDO
 ******************************************************************/

describe('redo', () => {
  it('redo edit', () => {
    const store = createTestStore()

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
    const store = createTestStore()

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
    const store = createTestStore()

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
    const store = createTestStore()

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
    const store = createTestStore()

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

  it('contiguous changes should be grouped', () => {
    const store = createTestStore()

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

  it('ignore dead actions and combine dispensible actions with the preceding patch', () => {
    const store = createTestStore()

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
