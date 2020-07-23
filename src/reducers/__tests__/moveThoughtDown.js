import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import moveThoughtDown from '../moveThoughtDown'
import setCursor from '../setCursor'

it('move within root', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    moveThoughtDown,

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
    newThought('a'),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought('a2'),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }] }),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a2
    - a1`)

})

it('move to next uncle', () => {

  const steps = [
    newThought('a'),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'b', at: [{ value: 'a', rank: 0 }] }),
    newThought({ value: 'b1', insertNewSubthought: true }),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }] }),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b
    - a1
    - b1`)

})

it('move descendants', () => {

  const steps = [
    newThought('a'),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a1.1', insertNewSubthought: true }),
    newThought({ value: 'b', at: [{ value: 'a', rank: 0 }] }),
    newThought({ value: 'b1', insertNewSubthought: true }),
    newThought({ value: 'b1.1', insertNewSubthought: true }),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    moveThoughtDown,
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
    newThought('a'),
    newThought('b'),
    moveThoughtDown,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})

it('trying to move last thought of context with no next uncle should do nothing', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a1.1', insertNewSubthought: true }),
    moveThoughtDown,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a1
      - a1.1
  - b`)

})

it('do nothing when there is no cursor', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    setCursor({ thoughtsRanked: null }),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})

it('move cursor thought should update cursor', () => {

  const steps = [
    newThought('a'),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought('a2'),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }] }),
    moveThoughtDown,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }, { value: 'a1', rank: 2 }])

})
