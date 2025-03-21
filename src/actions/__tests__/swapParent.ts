import State from '../../@types/State'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import setCursor from '../setCursor'
import swapParent from '../swapParent'

it('no-op if cursor is not set', () => {
  const text = `
  - x
  - a
    - b
     - c`

  const steps = [importText({ text }), swapParent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - b
      - c`)
})

it('no-op if cursor is a root thought', () => {
  const text = `
  - x
  - a
    - b
     - c`

  const steps = [
    importText({ text }),
    (state: State) => setCursor({ path: contextToPath(state, ['a'])! })(state),
    swapParent,
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - b
      - c`)
})

it('swaps child thought with parent', () => {
  const text = `
  - x
  - a
    - b
     - c`

  const steps = [
    importText({ text }),
    (state: State) => setCursor({ path: contextToPath(state, ['a', 'b'])! })(state),
    swapParent,
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - b
    - a
      - c`)

  expectPathToEqual(stateNew, stateNew.cursor, ['b', 'a'])
})

it('swaps a leaf thought with parent', () => {
  const text = `
  - x
  - a
    - b
     - c`

  const steps = [
    importText({ text }),
    (state: State) => setCursor({ path: contextToPath(state, ['a', 'b', 'c'])! })(state),
    swapParent,
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - c
      - b`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a', 'c', 'b'])
})

it('preserve siblings', () => {
  const text = `
    - a
      - b
        - c
      - d
  `

  const steps = [
    importText({ text }),
    (state: State) => setCursor({ path: contextToPath(state, ['a', 'b'])! })(state),
    swapParent,
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
    - a
      - c
    - d`)
})

it('swapped parent should take the rank of the child', () => {
  const text = `
    - a
      - b
        - c
      - d
  `

  const steps = [
    importText({ text }),
    (state: State) => setCursor({ path: contextToPath(state, ['a', 'd'])! })(state),
    swapParent,
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - d
    - b
      - c
    - a`)

  expectPathToEqual(stateNew, stateNew.cursor, ['d', 'a'])
})
