import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import subCategorizeAll from '../subCategorizeAll'
import setCursor from '../setCursor'

it('subcategorize multiple thoughts', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought 1
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // new subthought 2
    state => newThought(state, { value: 'c' }),

    // subcategorize
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

    // new thought 1
    state => newThought(state, { value: 'a' }),

    // new thought 2
    state => newThought(state, { value: 'b' }),

    // subcategorize
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

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // clear cursor
    state => setCursor(state, { thoughtsRanked: null }),

    // subcategorize
    subCategorizeAll,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b`)

})
