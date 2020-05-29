import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'
import newThought from '../newThought'
import existingThoughtMove from '../existingThoughtMove'

it('move within root', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b' }),

    // move thought
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    })
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
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: -1 }],
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a2
    - a1`)

})

it('move across contexts', () => {

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
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'b', rank: 0 }, { value: 'b1', rank: 0 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'b1', rank: 1 }],
    })
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

    // move thought
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    })
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
