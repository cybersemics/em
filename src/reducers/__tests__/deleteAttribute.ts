import State from '../../@types/State'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import deleteAttribute from '../deleteAttribute'
import importText from '../importText'
import newThought from '../newThought'
import setDescendant from '../setDescendant'

it('delete attribute', () => {
  const steps = [
    // new thought
    newThought('a'),

    // set attribute
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['=test', 'hello'],
      }),
    // delete attribute
    (state: State) =>
      deleteAttribute(state, {
        path: contextToPath(state, ['a'])!,
        value: '=test',
      }),
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

    (state: State) =>
      deleteAttribute(state, {
        path: contextToPath(state, ['a'])!,
        values: ['w', 'x', 'y', 'z'],
      }),
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

    (state: State) =>
      deleteAttribute(state, {
        path: contextToPath(state, ['a'])!,
        values: ['w', 'x', 'y', 'z'],
      }),
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
