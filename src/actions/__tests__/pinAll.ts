import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import pinAll from '../pinAll'

it('toggle on when there is no =children attribute', () => {
  const stateNew = reducerFlow([
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
    pinAll,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
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

it('toggle on when there is an unrelated =children attribute', () => {
  const stateNew = reducerFlow([
    importText({
      text: `
        - A
          - B
            - =children
              - =bullet
                - None
            - C
              - D
            - E
              - F
      `,
    }),
    setCursor(['A', 'B', 'C']),
    pinAll,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - A
    - B
      - =children
        - =bullet
          - None
        - =pin
      - C
        - D
      - E
        - F`)
})

it('toggle on when =children/=pin is false', () => {
  const stateNew = reducerFlow([
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
    pinAll,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
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
  const stateNew = reducerFlow([
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
    pinAll,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - c
      - d
    - e
      - f
      - g`)
})

it('remove =children when toggling off from =pin', () => {
  const stateNew = reducerFlow([
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
    pinAll,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - c
      - d
    - e
      - f
      - g`)
})

it('remove =pin/false from all subthoughts when toggling on', () => {
  const stateNew = reducerFlow([
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
    pinAll,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
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

it('preserve unrelated =children attributes when toggling off', () => {
  const stateNew = reducerFlow([
    importText({
      text: `
        - a
          - =children
            - =bullet
              - None
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
    pinAll,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - =children
      - =bullet
        - None
    - b
      - c
      - d
    - e
      - f
      - g`)
})

it('preserve unrelated =children attributes when toggling on from =pin/false', () => {
  const stateNew = reducerFlow([
    importText({
      text: `
        - a
          - =children
            - =bullet
              - None
            - =pin
              - false
          - b
            - c
      `,
    }),
    setCursor(['a', 'b']),
    pinAll,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - =children
      - =bullet
        - None
      - =pin
        - true
    - b
      - c`)
})

it('pin the top level when the cursor is on a top-level thought', () => {
  const stateNew = reducerFlow([
    importText({
      text: `
        - a
          - b
        - c
      `,
    }),
    setCursor(['a']),
    pinAll,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - =children
    - =pin
      - true
  - a
    - b
  - c`)
})

it('do nothing when there is no cursor', () => {
  const state = reducerFlow([
    importText({
      text: `
        - a
          - b
      `,
    }),
    setCursor(null),
  ])(initialState())

  expect(pinAll(state)).toBe(state)
})
