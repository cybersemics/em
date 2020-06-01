import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import {
  bumpThoughtDown,
  cursorBack,
  newThought,
} from '../index'

it('bump leaf', () => {

  const steps = [

    // new thought
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // bump thought down
    state => bumpThoughtDown(state),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - ${''}
      - b`)

})

it('bump thought with children', () => {

  const steps = [

    // new thought
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // new subthought
    state => newThought(state, { value: 'c', insertNewSubthought: true }),

    // new subthought
    cursorBack,

    // bump thought down
    state => bumpThoughtDown(state),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - ${''}
      - b
      - c`)

})

it('bump thought with children multiple times', () => {

  const steps = [

    // new thought
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // new subthought
    state => newThought(state, { value: 'c', insertNewSubthought: true }),

    // new subthought
    cursorBack,

    // bump thought down 2x
    state => bumpThoughtDown(state),
    state => bumpThoughtDown(state),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - ${''}
      - ${''}
      - b
      - c`)

})

it('bump root leaf', () => {

  const steps = [

    // new thought
    state => newThought(state, { value: 'a' }),

    // bump thought down
    state => bumpThoughtDown(state),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ${''}
    - a`)

})

it('bump root thought with children', () => {

  const steps = [

    // new thought
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // new subthought
    cursorBack,

    // bump thought down
    state => bumpThoughtDown(state),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ${''}
    - a
    - b`)

})
