import { inputHandlers } from '../../shortcuts'
import { importText } from '../../action-creators'
import { RANKED_ROOT } from '../../constants'
import { noop } from 'lodash'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attributeEquals } from '../../selectors'

it('toggle =pinChildren attribute of parent of cursor', async () => {

  const store = createTestStore()

  const { keyDown } = inputHandlers(store)

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
      - c
      - d
    - e
      - f
      - g
`))

  await store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
  ] })

  // toggle =pinChildren attribute
  keyDown({ preventDefault: noop, key: 'p', altKey: true, shiftKey: true } as KeyboardEvent)

  // parent of cursor should have =pinChildren set to true
  expect(attributeEquals(store.getState(), ['a'], '=pinChildren', 'true')).toBeTruthy()

  // toggle =pinSubthoughts attribute
  keyDown({ preventDefault: noop, key: 'p', altKey: true, shiftKey: true } as KeyboardEvent)

  // parent of cursor should not have =pinChildren attribute
  expect(attributeEquals(store.getState(), ['a'], '=pinChildren', 'false')).toBeFalsy()
})
