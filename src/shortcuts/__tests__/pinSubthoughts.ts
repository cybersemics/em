import { importText } from '../../action-creators'
import { NOOP, RANKED_ROOT } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attributeEquals } from '../../selectors'
import pinSubthoughtsShortcut from '../pinSubthoughts'
import executeShortcut from '../../test-helpers/executeShortcut'

const event = { preventDefault: NOOP } as Event

it('toggle on =pinChildren attribute of parent of cursor (initial state without =pinChildren)', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
      - c
      - d
    - e
      - f
      - g
`))

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
  ] })

  executeShortcut(pinSubthoughtsShortcut, { store, type: 'keyboard', event })

  // parent of cursor should have =pinChildren set to true
  expect(attributeEquals(store.getState(), ['a'], '=pinChildren', 'true')).toBeTruthy()
})

it('toggle on =pinChildren attribute of parent of cursor (initial state =pinChildren set to false)', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
    - =pinChildren
      - false
    - b
      - c
      - d
    - e
      - f
      - g
`))

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '2' },
  ] })

  executeShortcut(pinSubthoughtsShortcut, { store, type: 'keyboard', event })

  // parent of cursor should have =pinChildren set to true
  expect(attributeEquals(store.getState(), ['a'], '=pinChildren', 'true')).toBeTruthy()
})

it('toggle off =pinChildren attribute from parent of cursor', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
    - =pinChildren
      - true
    - b
      - c
      - d
    - e
      - f
      - g
`))

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '2' },
  ] })

  executeShortcut(pinSubthoughtsShortcut, { store, type: 'keyboard', event })

  // parent of cursor should not have =pinChildren set to true
  expect(attributeEquals(store.getState(), ['a'], '=pinChildren', 'true')).toBeFalsy()
})
