import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pinAllCommand from '../pinAll'

beforeEach(initStore)

it('toggle on when there is no =children attribute', () => {
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

  executeCommand(pinAllCommand, { store })

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
    setCursor(['a', 'b']),
  ])

  executeCommand(pinAllCommand, { store })

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

it('remove =children when toggling off from =pin/true', () => {
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
    setCursor(['a', 'b']),
  ])

  executeCommand(pinAllCommand, { store })

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

it('remove =children when toggling off from =pin', () => {
  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =children
            - =pin
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

  executeCommand(pinAllCommand, { store })

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

it('remove =pin/false from all subthoughts when toggling on', () => {
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
            - =pin
              - false
            - f
            - g
          - h
            - i
            - j
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(pinAllCommand, { store })

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
      - g
    - h
      - i
      - j`)
})
