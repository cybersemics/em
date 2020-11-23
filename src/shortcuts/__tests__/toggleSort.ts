import { EM_TOKEN, RANKED_ROOT } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attribute, rankThoughtsFirstMatch } from '../../selectors'
import toggleSortShortcut from '../toggleSort'
import executeShortcut from '../../test-helpers/executeShortcut'
import { ActionCreator } from '../../types'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

it('toggle on sort preference of cursor (initial state without =sort attribute)', () => {

  const store = createTestStore()

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
          - e`
    },
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
})

it('toggle off sort preference of cursor (initial state with =sort/Alphabetical)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    {
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - =sort
            - Alphabetical
          - d
          - b
          - c
          - e`
    },
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe(null)
})

it('override global Alphabetical with local None', () => {

  const store = createTestStore()

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

    ((dispatch, getState) => dispatch({
      type: 'existingThoughtChange',
      context: [EM_TOKEN, 'Settings', 'Global Sort'],
      oldValue: 'None',
      newValue: 'Alphabetical',
      path: rankThoughtsFirstMatch(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None'])
    })) as ActionCreator,

    setCursorFirstMatchActionCreator(['a']),

  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe('None')
})
