import { importText } from '../../action-creators'
import { attribute } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import pinSubthoughtsShortcut from '../pinSubthoughts'

it('toggle on when there is no =pinChildren', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  // parent of cursor should have =pinChildren set to true
  expect(attribute(store.getState(), ['a'], '=pinChildren')).toBe('true')
})

it('toggle on when =pinChildren is false', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
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
    `,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  // parent of cursor should have =pinChildren set to true
  expect(attribute(store.getState(), ['a'], '=pinChildren')).toBe('true')
})

it('remove =pinChildren when toggling off from true', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
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
    `,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  // parent of cursor should not have =pinChildren set to true
  expect(attribute(store.getState(), ['a'], '=pinChildren')).toBe(null)
})
