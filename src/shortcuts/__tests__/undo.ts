import { store as appStore } from '../../store'
import { MODALS, HOME_PATH, HOME_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { clear, importText, newThought, setCursor } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'
import { createMockStore } from '../../test-helpers/createMockStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import undoShortcut from '../undo'
import { initialState } from '../../util'
import * as undoUtils from '../../util/isUndoEnabled'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import testTimer from '../../test-helpers/testTimer'
import { initialize } from '../../initialize'

const timer = testTimer()

describe('undo shortcut', () => {
  const isUndoEnabled = jest.spyOn(undoUtils, 'isUndoEnabled')

  it('dispatches undo action on shortcut if undo is enabled', () => {
    // enable undo
    isUndoEnabled.mockImplementationOnce(() => true)

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
      path: HOME_PATH,
      text: `
        - a
        - b`
    }),
    setCursorFirstMatchActionCreator(['a']),
    {
      type: 'existingThoughtChange',
      newValue: 'aa',
      oldValue: 'a',
      context: [HOME_TOKEN],
      path: [{ value: 'a', rank: 0 }]
    },
    { type: 'undoAction' }
  ])

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b`

  expect(exported).toEqual(expectedOutput)
})

it('persists undo thought change', async () => {

  /**
   * Note: we can't use await with initialize as that results in a timeout error due to dexie. It's handled using the usetestTimer from Sinon.
   * More on that here - https://github.com/cybersemics/em/issues/919#issuecomment-739135971.
   */
  initialize()

  timer.useFakeTimer()

  appStore.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
        - b`
    }),
    setCursorFirstMatchActionCreator(['a']),
    newThought({ value: 'alpha', insertNewSubthought: true }), { type: 'undoAction' }
  ]
  )
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
      path: HOME_PATH,
      text: `
        - a
        - b
        - c
        - d`
    }),
    setCursorFirstMatchActionCreator(['b']),
    { type: 'indent' },
    {
      type: 'existingThoughtChange',
      newValue: 'b1',
      oldValue: 'b',
      context: ['a'],
      rankInContext: 0,
      path: [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }]
    },
    { type: 'cursorBack' },
    { type: 'moveThoughtDown' },
    { type: 'cursorDown' },
    setCursorFirstMatchActionCreator(['a', 'b1']),
    // undo 'moveThoughtDown', 'cursorDown' and 'setCursor'
    { type: 'undoAction' }
  ])

  const cursorAfterFirstUndo = store.getState().cursor
  expect(cursorAfterFirstUndo).toMatchObject([
    { value: 'a' }])

  const exportedAfterFirstUndo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  const expectedOutputAfterFirstUndo = `- ${HOME_TOKEN}
  - a
    - b1
  - c
  - d`

  expect(exportedAfterFirstUndo).toEqual(expectedOutputAfterFirstUndo)
  // undo 'cursorBack' and 'existingThoughtChange'
  store.dispatch({ type: 'undoAction' })

  const cursorAfterSecondUndo = store.getState().cursor
  expect(cursorAfterSecondUndo).toMatchObject([
    { value: 'a' }, { value: 'b' }])

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
      path: HOME_PATH,
      text: `
        - a
          - b
          - c
          - d`
    }),
    setCursor({ path: null }),
    {
      type: 'existingThoughtChange',
      context: ['a'],
      oldValue: 'b',
      newValue: 'bd',
      rankInContext: 0,
      path: [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }]
    },
    // dispensible set cursor (which only updates datanonce)
    setCursor({ path: null }),
    // undo setCursor and thoughtChange in a sinle action
    { type: 'undoAction' }
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

  store.dispatch(importText({
    path: HOME_PATH,
    text: `
      - a
       - b
       - c
       - d`,
    preventSetCursor: true
  }))

  const prevState = store.getState()
  expect(prevState.inversePatches.length).toEqual(0)

  store.dispatch({ type: 'undoAction' })

  expect(store.getState()).toEqual(prevState)
})

it('newThought action should be merged with the succeeding patch', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
          - a
          - b`
    }),
    { type: 'newThought', value: 'c' },
    { type: 'newThought', value: 'd' },
    {
      type: 'existingThoughtChange',
      context: [HOME_TOKEN],
      oldValue: 'd',
      newValue: 'd1',
      rankInContext: 3,
      path: [
        {
          value: 'd',
          rank: 3,
        }
      ]
    },
    // undo thought change and preceding newThought action
    { type: 'undoAction' }
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
      path: HOME_PATH,
      text: `
        - A
        - B`
    }),
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic',
      oldValue: 'A',
      context: [HOME_TOKEN],
      path: [{ value: 'A', rank: 0 }]
    },
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic City',
      oldValue: 'Atlantic',
      context: [HOME_TOKEN],
      path: [{ value: 'Atlantic', rank: 0 }]
    },
    { type: 'undoAction' }
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
      path: HOME_PATH,
      text: `
          - A
          - B`
    }),
    setCursorFirstMatchActionCreator(['a']),
    { type: 'archiveThought' },
  ])
  const { inversePatches } = store.getState()
  const lastPatch = inversePatches[inversePatches.length - 1]

  const thoughtsExists = lastPatch.some(({ path }) => path.includes('/thoughts'))
  expect(thoughtsExists).toEqual(true)

  const alertExists = lastPatch.some(({ path }) => path.includes('/alert'))
  expect(alertExists).toEqual(false)

})

it('clear patches when any undoable action is dispatched', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - A
        - B`,
      preventSetCursor: true,
    }),
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic',
      oldValue: 'A',
      context: [HOME_TOKEN],
      path: [{ value: 'A', rank: 0 }]
    },
    { type: 'newThought', value: 'New Jersey' },
    { type: 'undoAction' },
    { type: 'undoAction' }
  ])

  expect(store.getState().patches.length).toEqual(2)

  // dispatch an undoable action
  store.dispatch(newThought({ value: 'Atlantic City' }))

  expect(store.getState().patches.length).toEqual(0)

})

it('non-undoable actions are ignored', () => {
  const store = createTestStore()
  store.dispatch([
    { type: 'search', value: 'New' },
    { type: 'showModal', id: MODALS.welcome },
    { type: 'toggleSidebar' }
  ])

  expect(store.getState().inversePatches.length).toEqual(0)

})
