import { importText } from '../../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'

it('redo thought change', async () => {

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

  store.dispatch([importText(RANKED_ROOT, `
      - a
      - b`
  ),
  { type: 'cursorDown' },
  {
    type: 'existingThoughtChange',
    newValue: 'ar',
    oldValue: 'a',
    context: [ROOT_TOKEN],
    thoughtsRanked: [{ value: 'a', rank: 0 }]
  },
  { type: 'cursorUp' },
  { type: 'setCursor', thoughtsRanked: [{ value: 'ar', rank: 0 }] },
  { type: 'cursorBack' },
  {
    type: 'existingThoughtChange',
    newValue: 'arizona',
    oldValue: 'ar',
    context: [ROOT_TOKEN],
    thoughtsRanked: [{ value: 'ar', rank: 0 }]
  },
  { type: 'undoAction' },
  { type: 'undoAction' },
  // redo all actions preceding a thoughtchange as a single operation
  { type: 'redoAction' },
  { type: 'redoAction' },
  ])

  const exportedAfterRedo = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutputAfterRedo = `- ${ROOT_TOKEN}
  - arizona
  - b`

  expect(exportedAfterRedo).toEqual(expectedOutputAfterRedo)
})

it('redo contiguous changes', () => {
  const store = createTestStore()

  store.dispatch([importText(RANKED_ROOT, `
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
    newValue: 'Atlantic ',
    oldValue: 'Atlantic',
    context: [ROOT_TOKEN],
    thoughtsRanked: [{ value: 'Atlantic', rank: 0 }]
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
