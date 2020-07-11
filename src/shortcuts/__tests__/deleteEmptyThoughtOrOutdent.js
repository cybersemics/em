
import { inputHandlers } from '../../shortcuts'
import { importText } from '../../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { noop } from 'lodash'
import { createTestStore } from '../../test-helpers/createTestStore'

it('outdent on pressing backspace at the beginning of the thought', async () => {

  const store = createTestStore()

  const { keyDown } = inputHandlers(store)
  // skip tutorial and close welcome modal
  await store.dispatch({ type: 'modalComplete', id: 'welcome' })
  await store.dispatch({ type: 'tutorial', value: false })

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
      - c`))

  await store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: 0 },
    { value: 'b', rank: 1 },
    { value: 'c', rank: 2 },
  ] })

  // Note: Default focus offset of selection is 0. So this test doesn't mount Editable to emulate cursor seletion.
  keyDown({ preventDefault: noop, key: 'Backspace' })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
    - c`

  expect(exported).toEqual(expectedOutput)
})

it('prevent outdent on pressing backspace at the beginning of a thought that is not the only visible child in the context', async () => {

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
      - d`
  ))

  await store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: 0 },
    { value: 'b', rank: 1 },
    { value: 'd', rank: 3 },
  ] })

  // Note: Default focus offset of selection is 0. So this test doesn't mount Editable to emulate cursor seletion.
  keyDown({ preventDefault: noop, key: 'Backspace' })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - cd`

  expect(exported).toEqual(expectedOutput)
})
