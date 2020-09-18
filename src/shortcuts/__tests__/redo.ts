import { importText } from '../../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'

it('Redo thought change', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
  - b`))

  store.dispatch([{
    type: 'setCursor', thoughtsRanked: [
      { value: 'a', rank: '0' }
    ] }, { type: 'existingThoughtChange',
    newValue: 'aa',
    oldValue: 'a',
    context: [ROOT_TOKEN],
    thoughtsRanked: [{ value: 'a', rank: 0 }]
  }, {
    type: 'undoAction'
  }])

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
