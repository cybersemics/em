import { createTestStore } from '../../test-helpers/createTestStore'
import proseViewShortcut from '../proseView'
import { importText } from '../../action-creators'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import attributeByContext from '../../test-helpers/attributeByContext'

it('toggle on prose view of parent of cursor (inital state without =view attribute)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
    `,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should have =view attribute set to Prose
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe('Prose')
})

it('toggle on prose view of parent of cursor (inital state with =view attribute set to Table)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =view
            - table
          - b
            - c
    `,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should have =view attribute set to Prose
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe('Prose')
})

it('toggle off prose view of parent of cursor', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =view
            - Prose
          - b
            - c
    `,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should not have =view attribute set to Prose
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe(null)
})
