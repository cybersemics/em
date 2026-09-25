import { importText } from '..'
import State from '../../@types/State'
import ThoughtspaceTransaction from '../../@types/ThoughtspaceTransaction'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import initStore from '../../test-helpers/initStore'
import reducerFlow from '../../test-helpers/reducerFlow'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import newThought from '../newThought'
import toggleThought from '../toggleThought'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('toggle on single value', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleThought({
        path: contextToPath(state, ['a']),
        value: 'b',
      })(state, document),
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
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleThought({
        path: contextToPath(state, ['a']),
        value: 'b',
      })(state, document),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('toggle on deep value', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleThought({
        path: contextToPath(state, ['a']),
        values: ['b', 'c'],
      })(state, document),
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
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleThought({
        path: contextToPath(state, ['a']),
        values: ['b', 'c'],
      })(state, document),
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
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleThought({
        path: contextToPath(state, ['a']),
        values: ['c'],
      })(state, document),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
    - c`)
})

it('toggle on meta attribute above siblings', () => {
  const steps = [
    importText({
      text: `
        - a
          - b
      `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleThought({
        path: contextToPath(state, ['a']),
        values: ['=test'],
      })(state, document),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
    - b`)
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
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleThought({
        path: contextToPath(state, ['a']),
        values: ['b', 'c', 'e', 'f'],
      })(state, document),
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
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleThought({
        path: contextToPath(state, ['a']),
        values: ['b', 'c', 'd', 'e'],
      })(state, document),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - f`)
})
