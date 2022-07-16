import importText from '../../action-creators/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { createTestStore } from '../../test-helpers/createTestStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pinSubthoughtsShortcut from '../pinSubthoughts'

it('toggle on when there is no =children attribute', () => {
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
    setCursor(['a']),
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =children
      - =pin
        - true
    - b
      - c
      - d
    - e
      - f
      - g`)
})

it('toggle on when =children/=pin is false', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =children
            - =pin
              - false
          - b
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursor(['a']),
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =children
      - =pin
        - true
    - b
      - c
      - d
    - e
      - f
      - g`)
})

it('remove =children when toggling off from true', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =children
            - =pin
              - true
          - b
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursor(['a']),
  ])

  executeShortcut(pinSubthoughtsShortcut, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - c
      - d
    - e
      - f
      - g`)
})
