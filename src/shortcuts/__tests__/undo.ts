import { importText } from '../../action-creators'
import { NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'
import { createMockStore } from '../../test-helpers/createMockStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import undoShortcut from '../undo'
import { initialState } from '../../util'
import * as undoUtils from '../../util/isUndoEnabled'

describe('Undo Shortcut', () => {
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

it('Undo thought change', async () => {

  const store = createTestStore()

  store.dispatch([importText(RANKED_ROOT, `
- a
- b`), {
    type: 'setCursor', thoughtsRanked: [
      { value: 'a', rank: '0' }
    ]
  }, {
    type: 'existingThoughtChange',
    newValue: 'aa',
    oldValue: 'a',
    context: [ROOT_TOKEN],
    thoughtsRanked: [{ value: 'a', rank: 0 }]
  }, {
    type: 'undoAction'
  }])

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
  - b`

  expect(exported).toEqual(expectedOutput)
})

it('Group all navigation actions preceding a thought change and undo them together', async () => {

  const store = createTestStore()

  store.dispatch([importText(RANKED_ROOT, `
  - a
  - b
  - c
  - d`), {
    type: 'cursorDown'
  }, {
    type: 'existingThoughtChange',
    newValue: 'aa',
    oldValue: 'a',
    context: [ROOT_TOKEN],
    thoughtsRanked: [{ value: 'a', rank: 0 }]
  }, {
    type: 'cursorDown'
  }, {
    type: 'cursorDown'
  }, {
    type: 'setCursor'
  }, {
    type: 'cursorBack'
  }, {
    type: 'existingThoughtChange',
    context: [ROOT_TOKEN],
    oldValue: 'c',
    newValue: 'cc',
    thoughtsRanked: [
      {
        value: 'c',
        rank: 2,
      }
    ]
  },
  // undo thought change and preceding navigation actions
  {
    type: 'undoAction'
  }])

  // restore the cursor to it's state before navigation actions
  const { cursor } = store.getState()

  expect(cursor).toMatchObject([{ value: 'aa' }])

})

it('Ignore dead actions/Combine dispensible actions with the preceding patch', () => {
  const store = createTestStore()

  store.dispatch([importText(RANKED_ROOT, `
  - a
   - b
   - c
   - d`), {
    type: 'setCursor',
    thoughtsRanked: null
  }, {
    type: 'existingThoughtChange',
    context: [
      'a'
    ],
    oldValue: 'b',
    newValue: 'bd',
    rankInContext: 1,
    thoughtsRanked: [
      {
        value: 'b',
        rank: 1,
      }
    ]
  },
  // dispensible set cursor (which only updates datanonce)
  {
    type: 'setCursor',
    thoughtsRanked: null
  },
  // undo setCursor and thoughtChange in a sinle action
  {
    type: 'undoAction'
  }
  ])

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
    - c
    - d`

  expect(exported).toEqual(expectedOutput)
})

it('State remains unchanged if there are no inverse patches', () => {
  const store = createTestStore()

  store.dispatch([importText(RANKED_ROOT, `
  - a
   - b
   - c
   - d`)
  ])

  const prevState = store.getState()
  expect(prevState.inversePatches.length).toEqual(0)

  store.dispatch({ type: 'undoAction' })

  expect(store.getState()).toEqual(prevState)
})

it('NewThought action should be merged with the succeeding patch', () => {
  const store = createTestStore()

  store.dispatch([importText(RANKED_ROOT, `
  - a
  - b`), {
    type: 'newThought', value: 'c'
  }, {
    type: 'newThought', value: 'd'
  }, {
    type: 'existingThoughtChange',
    context: [
      ROOT_TOKEN
    ],
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
  // undo thought change and preceding navigation actions
  {
    type: 'undoAction'
  }])

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
  - b
  - c`

  expect(exported).toEqual(expectedOutput)

})
