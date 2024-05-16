import { importTextActionCreator as importText } from '../../actions/importText'
import attributeByContext from '../../test-helpers/attributeByContext'
import { createTestStore } from '../../test-helpers/createTestStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import proseViewShortcut from '../proseView'

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
    setCursor(['a']),
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
    setCursor(['a']),
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
    setCursor(['a']),
  ])

  executeShortcut(proseViewShortcut, { store })

  // parent of cursor should not have =view attribute set to Prose
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe(null)
})
