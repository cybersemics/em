import { RANKED_ROOT } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attribute } from '../../selectors'
import proseViewShortcut from '../proseView'
import executeShortcut from '../../test-helpers/executeShortcut'

it('toggle on prose view of parent of cursor (inital state without =view attribute)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    {
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - b
            - c
    ` },
    { type: 'setCursor', path: [{ value: 'a', rank: '0' }] }
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should have =view attribute set to Prose
  expect(attribute(store.getState(), ['a'], '=view')).toBe('Prose')
})

it('toggle on prose view of parent of cursor (inital state with =view attribute set to Table)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    {
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - =view
            - table
          - b
            - c
    ` },
    { type: 'setCursor', path: [{ value: 'a', rank: '0' }] }
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should have =view attribute set to Prose
  expect(attribute(store.getState(), ['a'], '=view')).toBe('Prose')
})

it('toggle off prose view of parent of cursor', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    {
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - =view
            - Prose
          - b
            - c
    ` },
    { type: 'setCursor', path: [{ value: 'a', rank: '0' }] }
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should not have =view attribute set to Prose
  expect(attribute(store.getState(), ['a'], '=view')).toBe(null)
})
