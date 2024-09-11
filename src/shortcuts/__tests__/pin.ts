import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import executeShortcut from '../../util/executeShortcut'
import pinShortcut from '../pin'

it('toggle on when there is no =pin attribute', () => {
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
    setCursor(['a', 'b']),
  ])

  executeShortcut(pinShortcut, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - =pin
      - c
      - d
    - e
      - f
      - g`)
})

it('toggle on when =pin/false', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - =pin
              - false
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeShortcut(pinShortcut, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - =pin
        - true
      - c
      - d
    - e
      - f
      - g`)
})

it('remove =pin when toggling off', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - =pin
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeShortcut(pinShortcut, { store })

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

it('remove =pin/true when toggling off', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
          - b
            - =pin
              - true
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeShortcut(pinShortcut, { store })

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
