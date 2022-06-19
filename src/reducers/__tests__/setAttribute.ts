import { HOME_TOKEN } from '../../constants'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import exportContext from '../../selectors/exportContext'
import newSubthought from '../newSubthought'
import contextToPath from '../../selectors/contextToPath'
import newThought from '../newThought'
import setAttribute from '../setAttribute'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import State from '../../@types/State'

it('set', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setAttribute(state, {
        path: contextToPath(state, ['a'])!,
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

it('different value should override existing value', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setAttribute(state, {
        path: contextToPath(state, ['a'])!,
        key: '=test',
        value: 'hello',
      }),
    (state: State) =>
      setAttribute(state, {
        path: contextToPath(state, ['a'])!,
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
      setAttribute(state, {
        path: contextToPath(state, ['a'])!,
        key: '=test',
        value: 'hello',
      }),
    (state: State) =>
      setAttribute(state, {
        path: contextToPath(state, ['a'])!,
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

it('omit value to set only attribute', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setAttribute(state, {
        path: contextToPath(state, ['a'])!,
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

it('set empty attribute', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setAttribute(state, {
        path: contextToPath(state, ['a'])!,
        key: '=test',
        value: '',
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      -${' '}`)
})
