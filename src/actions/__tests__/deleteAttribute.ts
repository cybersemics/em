import State from '../../@types/State'
import ThoughtspaceTransaction from '../../@types/ThoughtspaceTransaction'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import initStore from '../../test-helpers/initStore'
import reducerFlow from '../../test-helpers/reducerFlow'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import deleteAttribute from '../deleteAttribute'
import importText from '../importText'
import newThought from '../newThought'
import setDescendant from '../setDescendant'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('delete attribute', () => {
  const steps = [
    // new thought
    newThought('a'),

    // set attribute
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant({
        path: contextToPath(state, ['a'])!,
        values: ['=test', 'hello'],
      })(state, document),
    // delete attribute
    (state: State, document?: ThoughtspaceTransaction) =>
      deleteAttribute({
        path: contextToPath(state, ['a'])!,
        value: '=test',
      })(state, document),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('delete deep attribute with descendants', () => {
  const steps = [
    importText({
      text: `
        - a
          - w
            - x
              - y
                - z
      `,
    }),

    (state: State, document?: ThoughtspaceTransaction) =>
      deleteAttribute({
        path: contextToPath(state, ['a'])!,
        values: ['w', 'x', 'y', 'z'],
      })(state, document),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('preserve descendants with other children on delete deep', () => {
  const steps = [
    importText({
      text: `
        - a
          - w
            - x
              - m
              - y
                - z
      `,
    }),

    (state: State, document?: ThoughtspaceTransaction) =>
      deleteAttribute({
        path: contextToPath(state, ['a'])!,
        values: ['w', 'x', 'y', 'z'],
      })(state, document),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - w
      - x
        - m`)
})
