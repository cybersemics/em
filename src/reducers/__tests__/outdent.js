import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import outdent from '../outdent'
import setCursor from '../setCursor'

it('outdent within root', () => {

  // console.log('A', !!newThought(initialState(), { value: 'a' }))
  // console.log('B', !!newThought({ value: 'a' })(initialState()))
  // console.log('C', newThought(initialState()))

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
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
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    setCursor({ thoughtsRanked: null }),
    state => outdent(state)
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
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
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
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a2', insertNewSubthought: true }),
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

it('preserve cursor', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a2', insertNewSubthought: true }),
    outdent
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }])

})
