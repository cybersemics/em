import { HOME_PATH } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attribute } from '../../selectors'
import { importText } from '../../action-creators'
import toggleTableViewShortcut from '../toggleTableView'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

it('toggle on table view of parent of cursor (initial state without =view attribute)', () => {

  const store = createTestStore()

  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
          - b
            - c
          - d
            - e
    ` }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleTableViewShortcut, { store })

  // parent of cursor should have =view attribute set to Table
  expect(attribute(store.getState(), ['a'], '=view')).toBe('Table')
})

it('toggle on table view of parent of cursor (initial state =view attribute set to Prose)', () => {

  const store = createTestStore()

  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
          - =view
            - Prose
          - b
            - c
          - d
            - e
    ` }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleTableViewShortcut, { store })

  // parent of cursor should have =view attribute set to Table
  expect(attribute(store.getState(), ['a'], '=view')).toBe('Table')
})

it('toggle on table view of parent of cursor (initial state without =view attribute)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
          - =view
            - Table
          - b
            - c
          - d
            - e
      ` }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleTableViewShortcut, { store })

  // parent of cursor should not have =view attribute set to Table
  expect(attribute(store.getState(), ['a'], '=view')).toBe(null)
})
