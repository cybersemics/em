import { HOME_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { importText, newThought } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'

it('undo redo importText action', () => {
  const store = createTestStore()

  store.dispatch([
    newThought({}),
    importText({
      text: `
          - A
          - B`,
    }),
    { type: 'undoAction' },
  ])

  const exportedBeforeRedo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutputAfterUndo = `${HOME_TOKEN}`

  expect(exportedBeforeRedo).toEqual(expectedOutputAfterUndo)

  // redo thought change
  store.dispatch({ type: 'redoAction' })

  const exportedAfterRedo = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutputAfterRedo = `- ${HOME_TOKEN}
  - 
  - A
  - B`

  expect(exportedAfterRedo).toEqual(expectedOutputAfterRedo)
})
