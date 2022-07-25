import State from '../../@types/State'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import toggleAttribute from '../toggleAttribute'

it('toggle on', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      toggleAttribute(state, {
        path: contextToPath(state, ['a']),
        key: '=test',
        value: 'hello',
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - hello`)
})

it('toggle off', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      toggleAttribute(state, {
        path: contextToPath(state, ['a']),
        key: '=test',
        value: 'hello',
      }),
    (state: State) =>
      toggleAttribute(state, {
        path: contextToPath(state, ['a']),
        key: '=test',
        value: 'hello',
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('different value should override existing value', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      toggleAttribute(state, {
        path: contextToPath(state, ['a']),
        key: '=test',
        value: 'hello',
      }),
    (state: State) =>
      toggleAttribute(state, {
        path: contextToPath(state, ['a']),
        key: '=test',
        value: 'goodbye',
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - goodbye`)
})

it('add attribute if key has already been created', () => {
  const steps = [
    newThought('a'),
    newSubthought('=test'),
    setCursorFirstMatch(['a']),
    (state: State) =>
      toggleAttribute(state, {
        path: contextToPath(state, ['a']),
        key: '=test',
        value: 'hello',
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - hello`)
})

it('toggle nullary attribute on', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      toggleAttribute(state, {
        path: contextToPath(state, ['a']),
        key: '=test',
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test`)
})

it('toggle nullary attribute off', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      toggleAttribute(state, {
        path: contextToPath(state, ['a']),
        key: '=test',
      }),
    (state: State) =>
      toggleAttribute(state, {
        path: contextToPath(state, ['a']),
        key: '=test',
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})
