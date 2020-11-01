import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'

it('redo thought change', async () => {

  const store = createTestStore()

  store.dispatch([{
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - a
      - b`
    },
    { type: 'setCursor', path: [{ value: 'a', rank: '0' }] },
    {
      type: 'existingThoughtChange',
      newValue: 'aa',
      oldValue: 'a',
      context: [ROOT_TOKEN],
      path: [{ value: 'a', rank: 0 }]
    },
    { type: 'undoAction' }
  ])

  const exportedBeforeRedo = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutputAfterUndo = `- ${ROOT_TOKEN}
  - a
  - b`

  expect(exportedBeforeRedo).toEqual(expectedOutputAfterUndo)

  // redo thought change
  store.dispatch({ type: 'redoAction' })

  const exportedAfterRedo = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutputAfterRedo = `- ${ROOT_TOKEN}
  - aa
  - b`

  expect(exportedAfterRedo).toEqual(expectedOutputAfterRedo)

})

it('group contiguous navigation actions preceding a thought change on redo', () => {

  const store = createTestStore()

  store.dispatch([{
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - a
      - b
      - c`
    },
    { type: 'cursorDown' },
    { type: 'setCursor', path: [{ value: 'b', rank: 1 }] },
    { type: 'indent' },
    { type: 'cursorUp' },
    {
      type: 'existingThoughtChange',
      newValue: 'arizona',
      oldValue: 'a',
      context: [ROOT_TOKEN],
      path: [{ value: 'a', rank: 0 }]
    },
    { type: 'setCursor', path: [{ value: 'arizona', rank: 0 }, { value: 'b', rank: 0 }] },
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

  const exportedAfterRedo = exportContext(state, [ROOT_TOKEN], 'text/plain')
  const expectedOutputAfterRedo = `- ${ROOT_TOKEN}
  - arizona
    - boston
  - c`

  expect(exportedAfterRedo).toEqual(expectedOutputAfterRedo)
})

it('redo contiguous changes', () => {
  const store = createTestStore()

  store.dispatch([{
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - A
      - B`
    },
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic',
      oldValue: 'A',
      context: [ROOT_TOKEN],
      path: [{ value: 'A', rank: 0 }]
    },
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic ',
      oldValue: 'Atlantic',
      context: [ROOT_TOKEN],
      path: [{ value: 'Atlantic', rank: 0 }]
    },
    {
      type: 'existingThoughtChange',
      newValue: 'Atlantic City',
      oldValue: 'Atlantic ',
      context: [ROOT_TOKEN],
      path: [{ value: 'Atlantic ', rank: 0 }]
    },
    { type: 'undoAction' }
  ])

  const exportedBeforeRedo = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutputBeforeRedo = `- ${ROOT_TOKEN}
  - A
  - B`

  expect(exportedBeforeRedo).toEqual(expectedOutputBeforeRedo)

  store.dispatch({
    type: 'redoAction',
  })

  const exportedAfterRedo = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutputAfterRedo = `- ${ROOT_TOKEN}
  - Atlantic City
  - B`

  expect(exportedAfterRedo).toEqual(expectedOutputAfterRedo)

})
