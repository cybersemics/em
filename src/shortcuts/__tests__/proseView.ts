import { HOME_PATH } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attribute } from '../../selectors'
import { importText } from '../../action-creators'
import executeShortcut from '../../test-helpers/executeShortcut'

// must be imported after selectors to avoid circular import
import proseViewShortcut from '../proseView'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

it('toggle on prose view of parent of cursor (inital state without =view attribute)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
          - b
            - c
    ` }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should have =view attribute set to Prose
  expect(attribute(store.getState(), ['a'], '=view')).toBe('Prose')
})

it('toggle on prose view of parent of cursor (inital state with =view attribute set to Table)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
          - =view
            - table
          - b
            - c
    ` }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should have =view attribute set to Prose
  expect(attribute(store.getState(), ['a'], '=view')).toBe('Prose')
})

it('toggle off prose view of parent of cursor', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
          - =view
            - Prose
          - b
            - c
    ` }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should not have =view attribute set to Prose
  expect(attribute(store.getState(), ['a'], '=view')).toBe(null)
})
