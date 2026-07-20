import { importText } from '..'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import newThought from '../newThought'
import setBulletStyle from '../setBulletStyle'

it('set =children/=bullet/Ordered', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setBulletStyle(state, {
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: 'Ordered',
      }),
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
    (state: State) =>
      setBulletStyle(state, {
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: 'Alpha',
      }),
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
    (state: State) =>
      setBulletStyle(state, {
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: 'None',
      }),
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
    (state: State) =>
      setBulletStyle(state, {
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: null,
      }),
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
    (state: State) =>
      setBulletStyle(state, {
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: 'Ordered',
      }),
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
    (state: State) =>
      setBulletStyle(state, {
        simplePath: contextToPath(state, ['a']) as SimplePath,
        value: null,
      }),
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
