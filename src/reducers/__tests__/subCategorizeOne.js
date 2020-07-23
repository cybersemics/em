import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import subCategorizeOne from '../subCategorizeOne'
import setCursor from '../setCursor'

it('subcategorize a thought', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    subCategorizeOne,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    -${' '}
      - b`)

})

it('subcategorize a thought in the root', () => {

  const steps = [
    newThought('a'),
    subCategorizeOne,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  -${' '}
    - a`)

})

it('subcategorize with no cursor should do nothing', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    setCursor({ thoughtsRanked: null }),
    subCategorizeOne,
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
    newThought('a'),
    newSubthought('b'),
    subCategorizeOne,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }, { value: '', rank: -1 }])

})
