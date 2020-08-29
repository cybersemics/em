import { importText } from '../../action-creators'
import { NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'
import newSubthought from '../newSubthought'
import newThoughtOrOutdent from '../newThoughtOrOutdent'
import executeShortcut from '../../test-helpers/executeShortcut'

const event = { preventDefault: NOOP } as Event

it('empty thought should outdent when hit enter', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
      - c
        - d
          - e
            - f`))

  store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
    { value: 'c', rank: '2' },
    { value: 'd', rank: '3' },
    { value: 'e', rank: '4' },
    { value: 'f', rank: '5' },
  ] })

  // create a new empty subthought
  executeShortcut(newSubthought, { store, type: 'keyboard', event })

  // this should cause outdent instead of creating new thought
  executeShortcut(newThoughtOrOutdent, { store, type: 'keyboard', event })

  // this should cause outdent instead of creating new thought
  executeShortcut(newThoughtOrOutdent, { store, type: 'keyboard', event })

  // this should cause outdent instead of creating new thought
  executeShortcut(newThoughtOrOutdent, { store, type: 'keyboard', event })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - c
        - d
          - e
            - f
        -${' '}`

  expect(exported).toEqual(expectedOutput)
})
