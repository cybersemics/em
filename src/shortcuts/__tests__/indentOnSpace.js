import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { importText } from '../../action-creators'
import { exportContext } from '../../selectors'
import { inputHandlers } from '../../shortcuts'
import { noop } from 'lodash'
import { createTestStore } from '../../test-helpers/createTestStore'

it('indent on adding space at the beginning of the thought', async () => {

  const store = createTestStore()

  const { keyDown } = inputHandlers(store)
  // skip tutorial and close welcome modal
  await store.dispatch({ type: 'modalComplete', id: 'welcome' })
  await store.dispatch({ type: 'tutorial', value: false })

  await store.dispatch(importText(RANKED_ROOT, `
    - a
      - b
        - c
        - d`))

  await store.dispatch({
    type: 'setCursor',
    thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'b', rank: 1 }, { value: 'd', rank: 3 }],
  })

  keyDown({ preventDefault: noop, key: ' ' })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - c
        - d`

  expect(exported).toEqual(expectedOutput)
})

it('prevent indent on adding space at the beginning of the immovable thought', async () => {

  const store = createTestStore()

  const { keyDown } = inputHandlers(store)

  // skip tutorial and close welcome modal
  await store.dispatch({ type: 'modalComplete', id: 'welcome' })
  await store.dispatch({ type: 'tutorial', value: false })

  await store.dispatch(importText(RANKED_ROOT, `
    - a
      - b
        - c
        - d
          - =immovable`))

  await store.dispatch({
    type: 'setCursor',
    thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'b', rank: 1 }, { value: 'd', rank: 3 }]
  })

  keyDown({ preventDefault: noop, key: ' ' })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  // indent shouldn't happen and output should remain the same
  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - c
      - d
        - =immovable`

  expect(exported).toEqual(expectedOutput)
})
