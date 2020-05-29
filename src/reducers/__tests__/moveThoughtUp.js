import { store } from '../../store'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import moveThoughtUp from '../moveThoughtUp'
import setCursor from '../setCursor'

it('move within root', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b' }),

    // move thought
    moveThoughtUp,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - b
  - a`)

})

it('move within context', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought 1
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // new subthought 2
    state => newThought(state, { value: 'a2' }),

    // move thought
    moveThoughtUp,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a2
    - a1`)

})

it('move to prev uncle', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // new thought after a
    state => newThought(state, { value: 'b', at: [{ value: 'a', rank: 0 }] }),

    // new subthought
    state => newThought(state, { value: 'b1', insertNewSubthought: true }),

    // move thought
    moveThoughtUp,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a1
    - b1
  - b`)

})

it('move descendants', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new child
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // new grandchild
    state => newThought(state, { value: 'a1.1', insertNewSubthought: true }),

    // new thought after a
    state => newThought(state, { value: 'b', at: [{ value: 'a', rank: 0 }] }),

    // new subthought
    state => newThought(state, { value: 'b1', insertNewSubthought: true }),

    // new subthought
    state => newThought(state, { value: 'b1.1', insertNewSubthought: true }),

    // move cursor up
    state => setCursor(state, { thoughtsRanked: [{ value: 'b', rank: 1 }] }),

    // move thought
    moveThoughtUp,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - b
    - b1
      - b1.1
  - a
    - a1
      - a1.1`)

})

it('trying to move last thought of root should do nothing', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b' }),

    // move cursor up
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),

    // move thought
    moveThoughtUp,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})


it('trying to move first thought of context with no prev uncle should do nothing', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b' }),

    // new subthought
    state => newThought(state, { value: 'b1', insertNewSubthought: true }),

    // new subthought
    state => newThought(state, { value: 'b1.1', insertNewSubthought: true }),

    // move thought
    moveThoughtUp,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b
    - b1
      - b1.1`)

})

it('do nothing when there is no cursor', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b' }),

    // clear cursor
    state => setCursor(state, { thoughtsRanked: null }),

    // move thought
    moveThoughtUp,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})

