import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import setCursor from '../setCursor'
import toggleAttribute from '../toggleAttribute'

it('toggle on', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => toggleAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'hello'
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - =test
      - hello`)

})

it('toggle off', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => toggleAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'hello'
    }),
    state => toggleAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'hello'
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('different value should override existing value', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => toggleAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'hello'
    }),
    state => toggleAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'goodbye'
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - =test
      - goodbye`)

})

it('add attribute if key has already been created', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: '=test', insertNewSubthought: true }),
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    state => toggleAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'hello'
    }),
    state => toggleAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'goodbye'
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - =test
      - goodbye`)

})
