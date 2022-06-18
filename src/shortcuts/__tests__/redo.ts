import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import importText from '../../action-creators/importText'
import { createTestStore } from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import { editThoughtByContextActionCreator } from '../../test-helpers/editThoughtByContext'

it('redo thought change', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
        - b`,
    }),
    { type: 'cursorUp' },
    editThoughtByContextActionCreator({
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
    editThoughtByContextActionCreator({
      newValue: 'arizona',
      oldValue: 'a',
      at: ['a'],
    }),
    setCursorFirstMatchActionCreator(['arizona', 'b']),
    { type: 'cursorBack' },
    { type: 'cursorUp' },
    { type: 'cursorDown' },

    editThoughtByContextActionCreator({
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
    editThoughtByContextActionCreator({
      newValue: 'Atlantic',
      oldValue: 'A',
      at: ['A'],
    }),
    editThoughtByContextActionCreator({
      newValue: 'Atlantic ',
      oldValue: 'Atlantic',
      at: ['Atlantic'],
    }),
    editThoughtByContextActionCreator({
      newValue: 'Atlantic City',
      oldValue: 'Atlantic ',
      at: ['Atlantic '],
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
