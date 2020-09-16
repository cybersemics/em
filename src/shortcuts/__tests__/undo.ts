import { importText } from '../../action-creators'
import { NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import undoShortcut from '../undo'

const event = { preventDefault: NOOP } as Event

it('Undo thought change', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
  - b`))

  store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' }
  ] })

  store.dispatch({ type: 'existingThoughtChange',
    newValue: 'aa',
    oldValue: 'a',
    context: [ROOT_TOKEN],
    thoughtsRanked: [{ value: 'a', rank: 0 }]
  })

  // undo thought change
  executeShortcut(undoShortcut, { store, type: 'keyboard', event })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
  - b`

  expect(exported).toEqual(expectedOutput)
})
