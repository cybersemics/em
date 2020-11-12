import { NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext, rankThoughtsFirstMatch } from '../../selectors'

import { createTestStore } from '../../test-helpers/createTestStore'
import deleteEmptyThoughtOrOutdent from '../deleteEmptyThoughtOrOutdent'
import executeShortcut from '../../test-helpers/executeShortcut'

const event = { preventDefault: NOOP } as Event

it('do nothing when there is no cursor', async () => {

  const store = createTestStore()

  store.dispatch([
    { type: 'newThought', value: 'a' },
    { type: 'setCursor', path: null },
  ])

  executeShortcut(deleteEmptyThoughtOrOutdent, { store, type: 'keyboard', event })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a`

  expect(exported).toEqual(expectedOutput)
})

it('outdent on pressing backspace at the beginning of the thought', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - a
        - b
          - c
  ` })

  store.dispatch({ type: 'setCursor', path: rankThoughtsFirstMatch(store.getState(), ['a', 'b', 'c']) })

  executeShortcut(deleteEmptyThoughtOrOutdent, { store, type: 'keyboard', event })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
    - c`

  expect(exported).toEqual(expectedOutput)
})

it('prevent outdent on pressing backspace at the beginning of a thought that is not the only visible child in the context', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - a
        - b
          - c
          - d`
  })

  store.dispatch({ type: 'setCursor', path: rankThoughtsFirstMatch(store.getState(), ['a', 'b', 'd']) })

  executeShortcut(deleteEmptyThoughtOrOutdent, { store, type: 'keyboard', event })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - cd`

  expect(exported).toEqual(expectedOutput)
})
