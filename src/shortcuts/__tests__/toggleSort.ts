import { RANKED_ROOT } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attribute } from '../../selectors'
import toggleSortShortcut from '../toggleSort'
import executeShortcut from '../../test-helpers/executeShortcut'

it('toggle on sort preference of cursor (initial state without =sort attribute)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - a
        - d
        - b
        - c
        - e
  ` })

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
  ] })

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
})

it('toggle off sort preference of cursor (initial state with =sort/Alphabetical)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - a
        - =sort
          - Alphabetical
        - d
        - b
        - c
        - e
  ` })

  store.dispatch({ type: 'setCursor', path: [{ value: 'a', rank: '0' }] })

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe(null)
})

it.skip('override global sort', () => {

  const store = createTestStore()

  // TODO: Set global sort

  // import thoughts
  store.dispatch([
    {
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - d
          - b
          - c
          - e
    ` },
    { type: 'setCursor', path: [{ value: 'a', rank: '0' }] }
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe('None')
})
