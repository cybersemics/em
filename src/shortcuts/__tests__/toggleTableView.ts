import { inputHandlers } from '../../shortcuts'
import { importText } from '../../action-creators'
import { RANKED_ROOT } from '../../constants'
import { noop } from 'lodash'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attributeEquals } from '../../selectors'

it('toggle table view of parent of cursor', async () => {

  const store = createTestStore()

  const { keyDown } = inputHandlers(store)

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
      - c
    - d
      - e
`))

  await store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
  ] })

  // set =view attribute to Table
  keyDown({ preventDefault: noop, key: 't', altKey: true } as KeyboardEvent)

  // parent of cursor should have =view set to Table
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Table')).toBeTruthy()

  // remove value of Table from =view attribute
  keyDown({ preventDefault: noop, key: 't', altKey: true } as KeyboardEvent)

  // parent of cursor should not have =view attribute set to Prose
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Table')).toBeFalsy()
})
