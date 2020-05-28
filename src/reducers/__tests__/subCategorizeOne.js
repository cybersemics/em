import { store } from '../../store'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import subCategorizeOne from '../subCategorizeOne'
import setCursor from '../setCursor'

it('subcategorize a thought', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // subcategorize
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

    // new thought
    state => newThought(state, { value: 'a' }),

    // subcategorize
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

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // clear cursor
    state => setCursor(state, { thoughtsRanked: null }),

    // subcategorize
    subCategorizeOne,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b`)

})
