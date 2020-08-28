import { inputHandlers } from '../../shortcuts'
import { importText } from '../../action-creators'
import { RANKED_ROOT } from '../../constants'
import { noop } from 'lodash'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attributeEquals } from '../../selectors'

it('toggle prose view of parent of cursor', async () => {

  const store = createTestStore()

  const { keyDown } = inputHandlers(store)

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
      - c
`))

  await store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
  ] })

  // set =view attribute to Prose
  keyDown({ preventDefault: noop, key: 'p', shiftKey: true, metaKey: true } as KeyboardEvent)

  // parent of cursor should have =view set to Prose
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Prose')).toBeTruthy()

  // remove value of Prose from =view attribute
  keyDown({ preventDefault: noop, key: 'p', shiftKey: true, metaKey: true } as KeyboardEvent)

  // parent of cursor should not have =view attribute set to Prose
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Prose')).toBeFalsy()
})
