import { store } from '../../store'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import outdent from '../outdent'
import setCursor from '../setCursor'

it('outdent within root', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // outdent
    outdent
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - a1`)

})

it('outdent with no cursor should do nothing ', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // clear cursor
    state => setCursor(state,  { thoughtsRanked: null }),

    // outdent
    outdent
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a1`)

})

it('outdent root thought should do nothing ', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b' }),

    // outdent
    outdent
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})

it('outdent within context', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // new thought
    state => newThought(state, { value: 'a2', insertNewSubthought: true }),

    // outdent
    outdent
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a1
    - a2`)

})
