import { importText } from '..'
import SimplePath from '../../@types/SimplePath'
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
import setBulletStyle from '../setBulletStyle'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('set =children/=bullet/Ordered', () => {
  const steps = [
    newThought('a'),
    (state: State, transaction?: ThoughtspaceTransaction) =>
      setBulletStyle({
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: 'Ordered',
      })(state, transaction),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =children
      - =bullet
        - Ordered`)
})

it('set =children/=bullet/Alpha', () => {
  const steps = [
    newThought('a'),
    (state: State, transaction?: ThoughtspaceTransaction) =>
      setBulletStyle({
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: 'Alpha',
      })(state, transaction),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =children
      - =bullet
        - Alpha`)
})

it('replace an existing bullet style rather than toggling it off', () => {
  const steps = [
    importText({
      text: `
        - a
          - =children
            - =bullet
              - Ordered
      `,
    }),
    (state: State, transaction?: ThoughtspaceTransaction) =>
      setBulletStyle({
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: 'None',
      })(state, transaction),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =children
      - =bullet
        - None`)
})

it('setting the default (null) removes =children/=bullet and an emptied =children', () => {
  const steps = [
    importText({
      text: `
        - a
          - =children
            - =bullet
              - Ordered
      `,
    }),
    (state: State, transaction?: ThoughtspaceTransaction) =>
      setBulletStyle({
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: null,
      })(state, transaction),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('does not clobber sibling =children attributes when setting a bullet style', () => {
  const steps = [
    importText({
      text: `
        - a
          - =children
            - =style
              - color
                - tomato
          - b
      `,
    }),
    (state: State, transaction?: ThoughtspaceTransaction) =>
      setBulletStyle({
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: 'Ordered',
      })(state, transaction),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =children
      - =style
        - color
          - tomato
      - =bullet
        - Ordered
    - b`)
})

it('setting the default (null) preserves sibling =children attributes', () => {
  const steps = [
    importText({
      text: `
        - a
          - =children
            - =style
              - color
                - tomato
            - =bullet
              - Ordered
          - b
      `,
    }),
    (state: State, transaction?: ThoughtspaceTransaction) =>
      setBulletStyle({
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: null,
      })(state, transaction),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =children
      - =style
        - color
          - tomato
    - b`)
})
