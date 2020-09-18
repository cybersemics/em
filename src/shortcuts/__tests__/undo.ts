import { importText } from '../../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'

it('Undo thought change', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
  - b`))

  store.dispatch([{
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
