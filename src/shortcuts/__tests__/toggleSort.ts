import { inputHandlers } from '../../shortcuts'
import { importText } from '../../action-creators'
import { RANKED_ROOT } from '../../constants'
import { noop } from 'lodash'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attributeEquals, getSetting } from '../../selectors'

it('toggle sort preference of parent of cursor', async () => {

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

  const globalSort = getSetting(store.getState(), ['Global Sort'])
  const sortPreference = globalSort === 'Alphabetical' ? 'None' : 'Alphabetical'

  await store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
  ] })

  // set =sort attribute to sortPreference
  keyDown({ preventDefault: noop, key: 's', altKey: true } as KeyboardEvent)

  // parent of cursor should have =sort set to sortPreference
  expect(attributeEquals(store.getState(), ['a'], '=sort', sortPreference)).toBeTruthy()

  // remove value of sortPreference from =sort attribute
  keyDown({ preventDefault: noop, key: 's', altKey: true } as KeyboardEvent)

  // parent of cursor should not have =sort attribute set to sortPreference
  expect(attributeEquals(store.getState(), ['a'], '=sort', sortPreference)).toBeFalsy()
})
