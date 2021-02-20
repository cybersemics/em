import { HOME_PATH } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attribute } from '../../selectors'
import { importText } from '../../action-creators'
import pinSubthoughtsShortcut from '../pinSubthoughts'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

it('toggle on =pinChildren attribute of cursor (initial state without =pinChildren)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
          - b
            - c
            - d
          - e
            - f
            - g
    ` }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  // parent of cursor should have =pinChildren set to true
  expect(attribute(store.getState(), ['a'], '=pinChildren')).toBe('true')
})

it('toggle on =pinChildren attribute of cursor (initial state =pinChildren set to false)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
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
    ` }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  // parent of cursor should have =pinChildren set to true
  expect(attribute(store.getState(), ['a'], '=pinChildren')).toBe('true')
})

it('toggle off =pinChildren attribute of cursor', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
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
    ` }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  // parent of cursor should not have =pinChildren set to true
  expect(attribute(store.getState(), ['a'], '=pinChildren')).toBe('false')
})
