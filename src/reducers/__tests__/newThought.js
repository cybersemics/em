import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'
import newThought from '../newThought'

it('new thought in root', () => {

  const stateNew = newThought(initialState(), { value: 'a' })
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('new thought after', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new thought
    state => newThought(state, { value: 'b' }),

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})

it('new thought before', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new thought
    state => newThought(state, { value: 'b', insertBefore: true }),

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - b
  - a`)

})

it('new subthought', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b`)
})

it('new subthought top', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // new thought
    state => newThought(state, { value: 'c' }),

    // new subthought before
    state => newThought(state, { value: 'd', at: [{ value: 'a', rank: 0 }], insertNewSubthought: true, insertBefore: true }),

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - d
    - b
    - c`)
})
