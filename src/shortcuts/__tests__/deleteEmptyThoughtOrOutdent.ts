import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { exportContext, rankThoughtsFirstMatch } from '../../selectors'
import { importText, setCursor } from '../../action-creators'

import { createTestStore } from '../../test-helpers/createTestStore'
import deleteEmptyThoughtOrOutdent from '../deleteEmptyThoughtOrOutdent'
import executeShortcut from '../../test-helpers/executeShortcut'

it('do nothing when there is no cursor', () => {

  const store = createTestStore()

  store.dispatch([
    { type: 'newThought', value: 'a' },
    setCursor({ path: null }),
  ])

  executeShortcut(deleteEmptyThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a`

  expect(exported).toEqual(expectedOutput)
})

it('outdent on pressing backspace at the beginning of the thought', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText({
    path: HOME_PATH,
    text: `
      - a
        - b
          - c
  ` }))

  store.dispatch(setCursor({ path: rankThoughtsFirstMatch(store.getState(), ['a', 'b', 'c']) }))

  executeShortcut(deleteEmptyThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c`

  expect(exported).toEqual(expectedOutput)
})

it('do not outdent thought with siblings', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText({
    path: HOME_PATH,
    text: `
      - a
        - b
          - c
          - d`
  }))

  store.dispatch(setCursor({ path: rankThoughtsFirstMatch(store.getState(), ['a', 'b', 'd']) }))

  executeShortcut(deleteEmptyThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
      - cd`

  expect(exported).toEqual(expectedOutput)
})
