import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import subCategorizeAll from '../subCategorizeAll'
import setCursor from '../setCursor'

it('subcategorize multiple thoughts', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b', insertNewSubthought: true }),
    newThought({ value: 'c' }),
    subCategorizeAll,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    -${' '}
      - b
      - c`)

})

it('subcategorize multiple thoughts in the root', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    subCategorizeAll,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  -${' '}
    - a
    - b`)

})

it('should do nothing with no cursor', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b', insertNewSubthought: true }),
    setCursor({ thoughtsRanked: null }),
    subCategorizeAll,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b`)

})

it('set cursor on new empty thought', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a2' }),
    subCategorizeAll,

  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }, { value: '', rank: -1 }])

})
