import { importText } from '../../action-creators'
import { NOOP, RANKED_ROOT } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attributeEquals } from '../../selectors'
import toggleTableViewShortcut from '../toggleTableView'
import executeShortcut from '../../test-helpers/executeShortcut'

const event = { preventDefault: NOOP } as Event

it('toggle on table view of parent of cursor (initial state without =view attribute)', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
      - c
    - d
      - e
`))

  store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
  ] })

  executeShortcut(toggleTableViewShortcut, { store, type: 'keyboard', event })

  // parent of cursor should have =view attribute set to Table
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Table')).toBeTruthy()
})

it('toggle on table view of parent of cursor (initial state =view attribute set to Prose)', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
    - =view
      - Prose
    - b
      - c
    - d
      - e
`))

  store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '2' },
  ] })

  executeShortcut(toggleTableViewShortcut, { store, type: 'keyboard', event })

  // parent of cursor should have =view attribute set to Table
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Table')).toBeTruthy()
})

it('toggle on table view of parent of cursor (initial state without =view attribute)', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
    - =view
      - Table
    - b
      - c
    - d
      - e
`))

  store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '2' },
  ] })

  executeShortcut(toggleTableViewShortcut, { store, type: 'keyboard', event })

  // parent of cursor should not have =view attribute set to Table
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Table')).toBeFalsy()
})
