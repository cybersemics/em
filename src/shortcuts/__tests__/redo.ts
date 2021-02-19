import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { importText } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

it('redo thought change', () => {

  const store = createTestStore()

  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
        - b`
    }),
    { type: 'cursorUp' },
    {
      type: 'existingThoughtChange',
      newValue: 'aa',
      oldValue: 'a',
      context: [HOME_TOKEN],
      path: [{ value: 'a', rank: 0 }]
    },
    { type: 'undoAction' }
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
      path: HOME_PATH,
      text: `
        - a
        - b
        - c`
    }),
    { type: 'cursorDown' },
    { type: 'cursorUp' },
    { type: 'indent' },
    { type: 'cursorUp' },
    {
      type: 'existingThoughtChange',
      newValue: 'arizona',
      oldValue: 'a',
      context: [HOME_TOKEN],
      path: [{ value: 'a', rank: 0 }]
    },
    setCursorFirstMatchActionCreator(['arizona', 'b']),
    { type: 'cursorBack' },
    { type: 'cursorUp' },
    { type: 'cursorDown' },
    {
      type: 'existingThoughtChange',
      newValue: 'boston',
      oldValue: 'b',
      context: ['arizona'],
      path: [{ value: 'arizona', rank: 0 }, { value: 'b', rank: 0 }]
    },
    { type: 'cursorDown' },
    { type: 'undoAction' },
    { type: 'undoAction' },
    // redo all actions preceding a thoughtchange as a single operation
    { type: 'redoAction' }
  ])

  const cursorAfterFirstRedo = store.getState().cursor
  expect(cursorAfterFirstRedo).toMatchObject([{ value: 'arizona', rank: 0 }])

  store.dispatch({ type: 'redoAction' })
  const state = store.getState()
  const cursorAfterSecondRedo = store.getState().cursor
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
      newValue: 'Atlantic ',
      oldValue: 'Atlantic',
      context: [HOME_TOKEN],
      path: [{ value: 'Atlantic', rank: 0 }]
    },
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic City',
      oldValue: 'Atlantic ',
      context: [HOME_TOKEN],
      path: [{ value: 'Atlantic ', rank: 0 }]
    },
    { type: 'undoAction' }
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
