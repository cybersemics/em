import { importText } from '../../action-creators'
import { NOOP, RANKED_ROOT } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attributeEquals, getSetting } from '../../selectors'
import toggleSortShortcut from '../toggleSort'
import executeShortcut from '../../test-helpers/executeShortcut'

const event = { preventDefault: NOOP } as Event

it('toggle on sort preference of parent of cursor (initial state without =sort attribute)', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
    - d
    - b
    - c
    - e
`))

  const globalSort = getSetting(store.getState(), ['Global Sort'])
  const sortPreference = globalSort === 'Alphabetical' ? 'None' : 'Alphabetical'

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '2' },
  ] })

  executeShortcut(toggleSortShortcut, { store, type: 'keyboard', event })

  expect(attributeEquals(store.getState(), ['a'], '=sort', sortPreference)).toBeTruthy()
})

it('toggle off sort preference of parent of cursor', async () => {

  const store = createTestStore()

  const globalSort = getSetting(store.getState(), ['Global Sort'])
  const sortPreference = globalSort === 'Alphabetical' ? 'None' : 'Alphabetical'

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
    - =sort
      -${sortPreference}
    - d
    - b
    - c
    - e
`))

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '2' },
  ] })

  executeShortcut(toggleSortShortcut, { store, type: 'keyboard', event })

  expect(attributeEquals(store.getState(), ['a'], '=sort', sortPreference)).toBeFalsy()
})
