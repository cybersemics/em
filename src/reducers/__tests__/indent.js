import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import {
  indent,
  newThought,
  setCursor,
} from '../../reducers'

it('indent within root', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    indent
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b`)

})

it('indent with no cursor should do nothing ', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => setCursor(state, { thoughtsRanked: null }),
    indent
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})

it('indent fully indented thought should do nothing ', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b', insertNewSubthought: true }),
    indent
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b`)

})

it('indent within context', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    state => newThought(state, { value: 'a2' }),
    indent,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a1
      - a2`)

})

it('indent on cursor thought should update cursor', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    state => newThought(state, { value: 'a2' }),
    indent,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }, { value: 'a2', rank: 0 }])

})
