import { importTextActionCreator as importText } from '../../actions/importText'
import attributeByContext from '../../test-helpers/attributeByContext'
import { createTestStore } from '../../test-helpers/createTestStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import toggleTableViewShortcut from '../toggleTableView'

it('toggle on table view of parent of cursor (initial state without =view attribute)', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
          - d
            - e
    `,
    }),
    setCursor(['a']),
  ])

  executeShortcut(toggleTableViewShortcut, { store })

  // parent of cursor should have =view attribute set to Table
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe('Table')
})

it('toggle on table view of parent of cursor (initial state =view attribute set to Prose)', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
          - =view
            - Prose
          - b
            - c
          - d
            - e
    `,
    }),
    setCursor(['a']),
  ])

  executeShortcut(toggleTableViewShortcut, { store })

  // parent of cursor should have =view attribute set to Table
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe('Table')
})

it('toggle on table view of parent of cursor (initial state without =view attribute)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =view
            - Table
          - b
            - c
          - d
            - e
      `,
    }),
    setCursor(['a']),
  ])

  executeShortcut(toggleTableViewShortcut, { store })

  // parent of cursor should not have =view attribute set to Table
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe(null)
})
