import { NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext, rankThoughtsFirstMatch } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'
import indentOnSpace from '../indentOnSpace'
import executeShortcut from '../../test-helpers/executeShortcut'

const event = { preventDefault: NOOP } as Event

it('indent on adding space at the beginning of the thought', async () => {

  const store = createTestStore()

  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `
        - a
          - b
            - c
            - d
  `})

  store.dispatch({ type: 'setCursor', path: rankThoughtsFirstMatch(store.getState(), ['a', 'b', 'd']) })

  executeShortcut(indentOnSpace, { store, type: 'keyboard', event })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - c
        - d`

  expect(exported).toEqual(expectedOutput)
})

it('prevent indent on adding space at the beginning of the immovable thought', async () => {

  const store = createTestStore()

  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `
        - a
          - b
            - c
            - d
              - =immovable
  `})

  store.dispatch({
    type: 'setCursor',
    path: [{ value: 'a', rank: 0 }, { value: 'b', rank: 1 }, { value: 'd', rank: 3 }]
  })

  executeShortcut(indentOnSpace, { store, type: 'keyboard', event })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  // indent shouldn't happen and output should remain the same
  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - c
      - d
        - =immovable`

  expect(exported).toEqual(expectedOutput)
})
