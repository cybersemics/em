import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pinDescendantsCommand from '../pinDescendants'

beforeEach(initStore)

it('toggle on when there is no =descendants attribute', () => {
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
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(pinDescendantsCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =descendants
      - =pin
        - true
    - b
      - c
        - d
    - e
      - f`)
})

it('toggle on when there is an unrelated =descendants attribute', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =descendants
            - =test
          - b
            - c
              - d
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(pinDescendantsCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =descendants
      - =test
      - =pin
    - b
      - c
        - d`)
})

it('toggle on when =descendants/=pin is false', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =descendants
            - =pin
              - false
          - b
            - c
              - d
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(pinDescendantsCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =descendants
      - =pin
        - true
    - b
      - c
        - d`)
})

it('remove =descendants when toggling off from =pin/true', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =descendants
            - =pin
              - true
          - b
            - c
              - d
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(pinDescendantsCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - c
        - d`)
})

it('remove =descendants when toggling off from =pin', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =descendants
            - =pin
          - b
            - c
              - d
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(pinDescendantsCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - c
        - d`)
})

it('preserve unrelated =descendants attributes when toggling off', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =descendants
            - =test
            - =pin
          - b
            - c
              - d
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(pinDescendantsCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =descendants
      - =test
    - b
      - c
        - d`)
})
