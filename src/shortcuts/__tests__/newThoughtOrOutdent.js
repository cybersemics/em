import { inputHandlers } from '../../shortcuts'
import { importText } from '../../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { noop } from 'lodash'
import { createTestStore } from '../../test-helpers/createTestStore'

it('empty thought should outdent when hit enter', async () => {

  const store = createTestStore()

  const { keyDown } = inputHandlers(store)

  // skip tutorial and close welcome modal
  await store.dispatch({ type: 'modalComplete', id: 'welcome' })
  await store.dispatch({ type: 'tutorial', value: false })

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
      - c
        - d 
          - e
            - f`))

  await store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
    { value: 'c', rank: '2' },
    { value: 'd', rank: '3' },
    { value: 'e', rank: '4' },
    { value: 'f', rank: '5' },
  ] })

  // create a new empty subthought
  keyDown({ preventDefault: noop, key: 'Enter', ctrlKey: true })

  // this should cause outdent instead of creating new thought
  keyDown({ preventDefault: noop, key: 'Enter' })
  keyDown({ preventDefault: noop, key: 'Enter' })
  keyDown({ preventDefault: noop, key: 'Enter' })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

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
