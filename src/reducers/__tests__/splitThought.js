import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import splitThought from '../splitThought'

it('split thought', () => {

  const steps = [
    newThought('apple'),
    splitThought({ offset: 2 }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ap
  - ple`)

})

it('cursor moves to second thought', () => {

  const steps = [
    newThought('apple'),
    splitThought({ offset: 2 })
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'ple', rank: 1 }])

})
