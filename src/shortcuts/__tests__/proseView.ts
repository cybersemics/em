import { NOOP, RANKED_ROOT } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attributeEquals } from '../../selectors'
import proseViewShortcut from '../proseView'
import executeShortcut from '../../test-helpers/executeShortcut'

const event = { preventDefault: NOOP } as Event

it('toggle on prose view of parent of cursor (inital state without =view attribute)', async () => {

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

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
  ] })

  executeShortcut(proseViewShortcut, { store, type: 'keyboard', event })

  // parent of cursor should have =view attribute set to Prose
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Prose')).toBeTruthy()
})

it('toggle on prose view of parent of cursor (inital state with =view attribute set to Table)', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - a
        - =view
          - table
        - b
          - c
  ` })

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '2' },
  ] })

  executeShortcut(proseViewShortcut, { store, type: 'keyboard', event })

  // parent of cursor should have =view attribute set to Prose
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Prose')).toBeTruthy()
})

it('toggle off prose view of parent of cursor', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - a
        - =view
          - Prose
        - b
          - c
  ` })

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '2' },
  ] })

  executeShortcut(proseViewShortcut, { store, type: 'keyboard', event })

  // parent of cursor should not have =view attribute set to Prose
  expect(attributeEquals(store.getState(), ['a'], '=view', 'Prose')).toBeFalsy()
})
