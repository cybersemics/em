import { importText } from '../../action-creators'
import { MODALS, NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'
import { createMockStore } from '../../test-helpers/createMockStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import undoShortcut from '../undo'
import { initialState } from '../../util'
import * as undoUtils from '../../util/isUndoEnabled'

describe('undo shortcut', () => {
  const event = { preventDefault: NOOP } as Event
  const isUndoEnabled = jest.spyOn(undoUtils, 'isUndoEnabled')

  it('dispatches undo action on shortcut if undo is enabled', () => {
    // enable undo
    isUndoEnabled.mockImplementationOnce(() => true)

    const mockStore = createMockStore()
    const store = mockStore(initialState())

    executeShortcut(undoShortcut, { store, type: 'keyboard', event })

    expect(store.getActions()).toEqual([{ type: 'undoAction' }])
  })

  it('does not dispatch an undo action if undo is disabled', () => {
    // disable undo
    isUndoEnabled.mockImplementationOnce(() => false)

    const mockStore = createMockStore()
    const store = mockStore(initialState())

    executeShortcut(undoShortcut, { store, type: 'keyboard', event })

    expect(store.getActions()).toEqual([])
  })

})

it('undo thought change', async () => {

  const store = createTestStore()

  store.dispatch([
    importText(RANKED_ROOT, `
      - a
      - b`
    ),
    { type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: '0' }] },
    {
      type: 'existingThoughtChange',
      newValue: 'aa',
      oldValue: 'a',
      context: [ROOT_TOKEN],
      thoughtsRanked: [{ value: 'a', rank: 0 }]
    },
    { type: 'undoAction' }
  ])

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
  - b`

  expect(exported).toEqual(expectedOutput)
})

it('group all navigation actions following a thought change and undo them together', async () => {

  const store = createTestStore()

  store.dispatch([
    importText(RANKED_ROOT, `
      - a
      - b
      - c
      - d`
    ),
    { type: 'cursorDown' },
    {
      type: 'existingThoughtChange',
      newValue: 'aa',
      oldValue: 'a',
      context: [ROOT_TOKEN],
      thoughtsRanked: [{ value: 'a', rank: 0 }]
    },
    { type: 'setCursor', thoughtsRanked: null },
    { type: 'cursorBack' },
    { type: 'undoAction' }
  ])

  // restore the cursor to it's state before navigation actions
  const { cursor } = store.getState()

  expect(cursor).toMatchObject([
    { value: 'aa' }])

})

it('ignore dead actions/Combine dispensible actions with the preceding patch', () => {
  const store = createTestStore()

  store.dispatch([
    importText(RANKED_ROOT, `
      - a
        - b
        - c
        - d`
    ),
    { type: 'setCursor', thoughtsRanked: null },
    {
      type: 'existingThoughtChange',
      context: ['a'],
      oldValue: 'b',
      newValue: 'bd',
      rankInContext: 1,
      thoughtsRanked: [{ value: 'b', rank: 1 }]
    },
    // dispensible set cursor (which only updates datanonce)
    { type: 'setCursor', thoughtsRanked: null },
    // undo setCursor and thoughtChange in a sinle action
    { type: 'undoAction' }
  ])

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
    - c
    - d`

  expect(exported).toEqual(expectedOutput)
})

it('state remains unchanged if there are no inverse patches', () => {
  const store = createTestStore()

  store.dispatch(importText(RANKED_ROOT, `
    - a
     - b
     - c
     - d`)
  )

  const prevState = store.getState()
  expect(prevState.inversePatches.length).toEqual(0)

  store.dispatch({ type: 'undoAction' })

  expect(store.getState()).toEqual(prevState)
})

it('newThought action should be merged with the succeeding patch', () => {
  const store = createTestStore()

  store.dispatch([
    importText(RANKED_ROOT, `
      - a
      - b`
    ),
    { type: 'newThought', value: 'c' },
    { type: 'newThought', value: 'd' },
    {
      type: 'existingThoughtChange',
      context: [ROOT_TOKEN],
      oldValue: 'd',
      newValue: 'd1',
      rankInContext: 3,
      thoughtsRanked: [
        {
          value: 'd',
          rank: 3,
        }
      ]
    },
    // undo thought change and preceding newThought action
    { type: 'undoAction' }
  ])

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
  - b
  - c`

  expect(exported).toEqual(expectedOutput)

})

it('undo contiguous changes', () => {
  const store = createTestStore()

  store.dispatch([
    importText(RANKED_ROOT, `
      - A
      - B`
    ),
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic',
      oldValue: 'A',
      context: [ROOT_TOKEN],
      thoughtsRanked: [{ value: 'A', rank: 0 }]
    },
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic City',
      oldValue: 'Atlantic ',
      context: [ROOT_TOKEN],
      thoughtsRanked: [{ value: 'Atlantic ', rank: 0 }]
    },
    { type: 'undoAction' }
  ])

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - A
  - B`

  expect(exported).toEqual(expectedOutput)

})

it('state.alert is omitted from the undo patch', () => {
  const store = createTestStore()

  store.dispatch([
    importText(RANKED_ROOT, `
      - A
      - B`
    ),
    { type: 'alert', value: 'test' }
  ])

  expect(store.getState().inversePatches.length).toEqual(0)

})

it('clear patches when any undoable action is dispatched', () => {
  const store = createTestStore()

  store.dispatch([
    importText(RANKED_ROOT, `
      - A
      - B`
    ),
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic',
      oldValue: 'A',
      context: [ROOT_TOKEN],
      thoughtsRanked: [{ value: 'A', rank: 0 }]
    },
    { type: 'newThought', value: 'New Jersey' },
    { type: 'undoAction' },
    { type: 'undoAction' }
  ])

  expect(store.getState().patches.length).toEqual(2)

  // dispatch an undoable action
  store.dispatch({
    type: 'newThought', value: 'Atlantic City'
  })

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
