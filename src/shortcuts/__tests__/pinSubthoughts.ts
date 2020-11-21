import { RANKED_ROOT } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attribute } from '../../selectors'
import pinSubthoughtsShortcut from '../pinSubthoughts'
import executeShortcut from '../../test-helpers/executeShortcut'

it('toggle on =pinChildren attribute of cursor (initial state without =pinChildren)', async () => {

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
            - d
          - e
            - f
            - g
    ` },
    { type: 'setCursor', path: [{ value: 'a', rank: '0' }] }
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  // parent of cursor should have =pinChildren set to true
  expect(attribute(store.getState(), ['a'], '=pinChildren')).toBe('true')
})

it('toggle on =pinChildren attribute of cursor (initial state =pinChildren set to false)', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    {
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - =pinChildren
            - false
          - b
            - c
            - d
          - e
            - f
            - g
    ` },
    { type: 'setCursor', path: [{ value: 'a', rank: '0' }] }
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  // parent of cursor should have =pinChildren set to true
  expect(attribute(store.getState(), ['a'], '=pinChildren')).toBe('true')
})

it('toggle off =pinChildren attribute of cursor', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    {
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - =pinChildren
            - true
          - b
            - c
            - d
          - e
            - f
            - g
    ` },
    { type: 'setCursor', path: [{ value: 'a', rank: '0' }] }
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  // parent of cursor should not have =pinChildren set to true
  expect(attribute(store.getState(), ['a'], '=pinChildren')).toBe('false')
})
