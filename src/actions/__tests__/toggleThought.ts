import { importText } from '..'
import State from '../../@types/State'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import newThought from '../newThought'
import toggleThought from '../toggleThought'

it('toggle on single value', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      toggleThought(state, {
        path: contextToPath(state, ['a']),
        value: 'b',
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

it('toggle off single value', () => {
  const steps = [
    importText({
      text: `
        - a
          - b
      `,
    }),
    (state: State) =>
      toggleThought(state, {
        path: contextToPath(state, ['a']),
        value: 'b',
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('toggle on deep value', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      toggleThought(state, {
        path: contextToPath(state, ['a']),
        values: ['b', 'c'],
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - c`)
})

it('toggle off deep value', () => {
  const steps = [
    importText({
      text: `
        - a
          - b
            - c
      `,
    }),
    (state: State) =>
      toggleThought(state, {
        path: contextToPath(state, ['a']),
        values: ['b', 'c'],
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('preserve siblings when toggling on single value', () => {
  const steps = [
    importText({
      text: `
        - a
          - b
      `,
    }),
    (state: State) =>
      toggleThought(state, {
        path: contextToPath(state, ['a']),
        values: ['c'],
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
    - c`)
})

it('preserve ancestors when toggling on deep value', () => {
  const steps = [
    importText({
      text: `
      - a
        - b
          - c
            - d
    `,
    }),
    (state: State) =>
      toggleThought(state, {
        path: contextToPath(state, ['a']),
        values: ['b', 'c', 'e', 'f'],
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - c
        - d
        - e
          - f`)
})

it('preserve ancestor siblings when toggling off deep value', () => {
  const steps = [
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
    (state: State) =>
      toggleThought(state, {
        path: contextToPath(state, ['a']),
        values: ['b', 'c', 'd', 'e'],
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - f`)
})
