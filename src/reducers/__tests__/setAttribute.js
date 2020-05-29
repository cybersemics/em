import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import setCursor from '../setCursor'
import setAttribute from '../setAttribute'

it('set', () => {

  const steps = [

    // new thought
    state => newThought(state, { value: 'a' }),

    // set
    state => setAttribute(state, {
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

it('different value should override existing value', () => {

  const steps = [

    // new thought
    state => newThought(state, { value: 'a' }),

    // set on
    state => setAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'hello'
    }),

    // set off
    state => setAttribute(state, {
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

    // new thought
    state => newThought(state, { value: 'a' }),

    // attribute key
    state => newThought(state, { value: '=test', insertNewSubthought: true }),

    // move back
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),

    // set on
    state => setAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'hello'
    }),

    // set off
    state => setAttribute(state, {
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
