import { HOME_TOKEN } from '../../constants'
import { childIdsToThoughts, exportContext } from '../../selectors'
import { importText } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import { editThoughtAtFirstMatchActionCreator } from '../../test-helpers/editThoughtAtFirstMatch'

it('redo thought change', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - b`,
    }),
    { type: 'cursorUp' },
    editThoughtAtFirstMatchActionCreator({
      newValue: 'aa',
      oldValue: 'a',
      at: ['a'],
    }),
    { type: 'undoAction' },
  ])

  const exportedBeforeRedo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutputAfterUndo = `- ${HOME_TOKEN}
  - a
  - b`

  expect(exportedBeforeRedo).toEqual(expectedOutputAfterUndo)

  // redo thought change
  store.dispatch({ type: 'redoAction' })

  const exportedAfterRedo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutputAfterRedo = `- ${HOME_TOKEN}
  - aa
  - b`

  expect(exportedAfterRedo).toEqual(expectedOutputAfterRedo)
})

it('group contiguous navigation actions preceding a thought change on redo', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c`,
    }),
    { type: 'cursorUp' },
    { type: 'indent' },
    { type: 'cursorUp' },
    editThoughtAtFirstMatchActionCreator({
      newValue: 'arizona',
      oldValue: 'a',
      at: ['a'],
    }),
    setCursorFirstMatchActionCreator(['arizona', 'b']),
    { type: 'cursorBack' },
    { type: 'cursorUp' },
    { type: 'cursorDown' },

    editThoughtAtFirstMatchActionCreator({
      newValue: 'boston',
      oldValue: 'b',
      at: ['arizona', 'b'],
    }),
    { type: 'cursorDown' },
    { type: 'undoAction' },
    { type: 'undoAction' },
    // redo all actions preceding a thoughtchange as a single operation
    { type: 'redoAction' },
  ])

  const cursorAfterFirstRedo = childIdsToThoughts(store.getState(), store.getState().cursor!)
  expect(cursorAfterFirstRedo).toMatchObject([{ value: 'arizona', rank: 0 }])

  store.dispatch({ type: 'redoAction' })
  const state = store.getState()
  const cursorAfterSecondRedo = childIdsToThoughts(store.getState(), store.getState().cursor!)
  expect(cursorAfterSecondRedo).toMatchObject([{ value: 'arizona' }, { value: 'boston' }])

  const exportedAfterRedo = exportContext(state, [HOME_TOKEN], 'text/plain')
  const expectedOutputAfterRedo = `- ${HOME_TOKEN}
  - arizona
    - boston
  - c`

  expect(exportedAfterRedo).toEqual(expectedOutputAfterRedo)
})

it('redo contiguous changes', () => {
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
      newValue: 'Atlantic ',
      oldValue: 'Atlantic',
      at: ['Atlantic'],
    }),
    editThoughtAtFirstMatchActionCreator({
      newValue: 'Atlantic City',
      oldValue: 'Atlantic ',
      at: ['Atlantic'],
    }),
    { type: 'undoAction' },
  ])

  const exportedBeforeRedo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutputBeforeRedo = `- ${HOME_TOKEN}
  - A
  - B`

  expect(exportedBeforeRedo).toEqual(expectedOutputBeforeRedo)

  store.dispatch({
    type: 'redoAction',
  })

  const exportedAfterRedo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutputAfterRedo = `- ${HOME_TOKEN}
  - Atlantic City
  - B`

  expect(exportedAfterRedo).toEqual(expectedOutputAfterRedo)
})
