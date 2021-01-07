import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { importText } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'
import subcategorizeAll from '../subcategorizeAll'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

it('move all visible and hidden thoughts into a new empty thought after subcategorizeAll', () => {

  // Note: This tests for this issue https://github.com/cybersemics/em/issues/962
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: RANKED_ROOT,
      text: `
        - a
          - b
            - =archive
            - c
              - d`
    }),
    setCursorFirstMatchActionCreator(['a', 'b', 'c']),
  ])

  executeShortcut(subcategorizeAll, { store })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      -${' '}
        - =archive
        - c
          - d`

  expect(exported).toEqual(expectedOutput)
})
