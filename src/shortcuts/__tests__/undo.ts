import { store as appStore } from '../../store'
import { HOME_TOKEN } from '../../constants'
import { childIdsToThoughts, exportContext } from '../../selectors'
import { clear, importText, newThought, setCursor } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'
import { createMockStore } from '../../test-helpers/createMockStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import undoShortcut from '../undo'
import { initialState } from '../../util'
import * as undoUtils from '../../selectors/isUndoEnabled'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import testTimer from '../../test-helpers/testTimer'
import { initialize } from '../../initialize'
import { editThoughtAtFirstMatchActionCreator } from '../../test-helpers/editThoughtAtFirstMatch'

const timer = testTimer()

describe('undo shortcut', () => {
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
})

it('undo thought change', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - b`,
    }),
    setCursorFirstMatchActionCreator(['a']),
    editThoughtAtFirstMatchActionCreator({
      newValue: 'aa',
      oldValue: 'a',
      at: ['a'],
    }),
    { type: 'undoAction' },
  ])

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b`

  expect(exported).toEqual(expectedOutput)
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
    setCursorFirstMatchActionCreator(['a']),
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
    setCursorFirstMatchActionCreator(['b']),
    { type: 'indent' },
    editThoughtAtFirstMatchActionCreator({
      newValue: 'b1',
      oldValue: 'b',
      rankInContext: 0,
      at: ['a', 'b'],
    }),
    { type: 'cursorBack' },
    { type: 'moveThoughtDown' },
    { type: 'cursorDown' },
    setCursorFirstMatchActionCreator(['a', 'b1']),
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

it('ignore dead actions/Combine dispensible actions with the preceding patch', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
          - b
          - c
          - d`,
    }),
    setCursor({ path: null }),
    editThoughtAtFirstMatchActionCreator({
      oldValue: 'b',
      newValue: 'bd',
      rankInContext: 0,
      at: ['a', 'b'],
    }),
    // dispensible set cursor (which only updates datanonce)
    setCursor({ path: null }),
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

it('state remains unchanged if there are no inverse patches', () => {
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

it('newThought action should be merged with the succeeding patch', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
          - a
          - b`,
    }),
    { type: 'newThought', value: 'c' },
    { type: 'newThought', value: 'd' },
    editThoughtAtFirstMatchActionCreator({
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

it('undo contiguous changes', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - A
        - B`,
    }),
    editThoughtAtFirstMatchActionCreator({
      newValue: 'Atlantic',
      oldValue: 'A',
      at: ['A'],
    }),
    editThoughtAtFirstMatchActionCreator({
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

it('state.alert is omitted from the undo patch', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
          - A
          - B`,
    }),
    setCursorFirstMatchActionCreator(['A']),
    { type: 'archiveThought' },
  ])
  const { undoPatches } = store.getState()
  const lastPatch = undoPatches[undoPatches.length - 1]

  const thoughtsExists = lastPatch.some(({ path }) => path.includes('/thoughts'))
  expect(thoughtsExists).toEqual(true)

  const alertExists = lastPatch.some(({ path }) => path.includes('/alert'))
  expect(alertExists).toEqual(false)
})

it('clear patches when any undoable action is dispatched', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - A
        - B`,
      preventSetCursor: true,
    }),
    editThoughtAtFirstMatchActionCreator({
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

it('non-undoable actions are ignored', () => {
  const store = createTestStore()
  store.dispatch([{ type: 'search', value: 'New' }, { type: 'showModal', id: 'welcome' }, { type: 'toggleSidebar' }])

  expect(store.getState().undoPatches.length).toEqual(0)
})

it('undo redo importText action', () => {
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

  const exportedBeforeRedo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutputAfterUndo = `- ${HOME_TOKEN}`

  expect(exportedBeforeRedo).toEqual(expectedOutputAfterUndo)

  // redo thought change
  store.dispatch({ type: 'redoAction' })

  const exportedAfterRedo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutputAfterRedo = `- ${HOME_TOKEN}
  - ${''}
  - A
  - B`

  expect(exportedAfterRedo).toEqual(expectedOutputAfterRedo)
})
