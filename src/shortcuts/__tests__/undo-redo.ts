import clear from '../../action-creators/clear'
import importText from '../../action-creators/importText'
import newThought from '../../action-creators/newThought'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import * as undoUtils from '../../selectors/isUndoEnabled'
import { store as appStore } from '../../store'
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
  const isUndoEnabled = jest.spyOn(undoUtils, 'isUndoEnabled')

  it('dispatches undo action on shortcut if undo is enabled', () => {
    // enable undo
    isUndoEnabled.mockReturnValue(true)

    const mockStore = createMockStore()
    const store = mockStore(initialState())

    executeShortcut(undoShortcut, { store })

    expect(store.getActions()).toEqual([{ type: 'undoAction' }])
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
      editThought({
        newValue: 'aa',
        oldValue: 'a',
        at: ['a'],
      }),
      { type: 'undoAction' },
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

    store.dispatch({ type: 'undoAction' })

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
      { type: 'archiveThought' },
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
      { type: 'undoAction' },
    ])

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}`)
  })

  it('cursor should restore to same thought if the thought has been edited after undo', () => {
    const store = createTestStore()

    store.dispatch([
      newThought({}),
      setCursor(['']),
      editThought({ newValue: 'a', oldValue: '', at: [''] }),
      newThought({}),
      setCursor(['']),
      editThought({ newValue: 'b', oldValue: '', at: [''] }),
      setCursor(['a']),
      editThought({ newValue: 'aa', oldValue: 'a', at: ['a'] }),
      { type: 'undoAction' },
    ])

    const expectedCursor = [{ value: 'a', rank: 0 }]

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject(expectedCursor)
  })

  it('cursor should restore correctly after undo archive', async () => {
    timer.useFakeTimer()
    initialize()
    await timer.runAllAsync()

    appStore.dispatch([newThought({ value: 'a' }), setCursor(null)])
    await timer.runAllAsync()

    timer.useFakeTimer()
    // clear and call initialize again to reload from local db (simulating page refresh)
    appStore.dispatch(clear())
    await timer.runAllAsync()

    initialize()

    await timer.runAllAsync()

    appStore.dispatch([setCursor(['a']), { type: 'archiveThought' }, { type: 'undoAction' }])
    await timer.runAllAsync()

    timer.useRealTimer()

    const expectedCursor = [{ value: 'a', rank: 0 }]

    const cursorThoughts = childIdsToThoughts(appStore.getState(), appStore.getState().cursor!)

    expect(cursorThoughts).toMatchObject(expectedCursor)
  })

  // @MIGRATION_TODO
  it.skip('persists undo thought change', async () => {
    /**
     * Note: we can't use await with initialize as that results in a timeout error due to dexie. It's handled using the usetestTimer from Sinon.
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
      { type: 'undoAction' },
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
      editThought({
        newValue: 'aa',
        oldValue: 'a',
        at: ['a'],
      }),
      { type: 'undoAction' },
      { type: 'redoAction' },
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
      { type: 'undoAction' },
    ])

    // redo thought change
    store.dispatch({ type: 'redoAction' })

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
      editThought({
        newValue: 'Atlantic',
        oldValue: 'A',
        at: ['A'],
      }),
      { type: 'newThought', value: 'New Jersey' },
      { type: 'undoAction' },
      { type: 'undoAction' },
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
      { type: 'indent' },
      editThought({
        newValue: 'b1',
        oldValue: 'b',
        rankInContext: 0,
        at: ['a', 'b'],
      }),
      { type: 'cursorBack' },
      { type: 'moveThoughtDown' },
      { type: 'cursorDown' },
      setCursor(['a', 'b1']),
      // undo 'moveThoughtDown', 'cursorDown' and 'setCursor'
      { type: 'undoAction' },
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
    store.dispatch({ type: 'undoAction' })

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
      { type: 'newThought', value: 'c' },
      { type: 'newThought', value: 'd' },
      editThought({
        oldValue: 'd',
        newValue: 'd1',
        rankInContext: 3,
        at: ['d'],
      }),
      // undo thought change and preceding newThought action
      { type: 'undoAction' },
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
      editThought({
        newValue: 'Atlantic',
        oldValue: 'A',
        at: ['A'],
      }),
      editThought({
        newValue: 'Atlantic City',
        oldValue: 'Atlantic',
        at: ['Atlantic'],
      }),
      { type: 'undoAction' },
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
      editThought({
        oldValue: 'b',
        newValue: 'bd',
        rankInContext: 0,
        at: ['a', 'b'],
      }),
      // dispensible set cursor (which only updates datanonce)
      setCursor(null),
      // undo setCursor and thoughtChange in a sinle action
      { type: 'undoAction' },
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
