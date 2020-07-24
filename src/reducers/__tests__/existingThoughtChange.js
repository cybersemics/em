import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext, getContexts, getThoughtsRanked } from '../../selectors'
import { existingThoughtChange, newThought, setCursor } from '../../reducers'

it('edit a thought', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    existingThoughtChange({
      newValue: 'c',
      oldValue: 'a',
      context: [ROOT_TOKEN],
      thoughtsRanked: [ { value: 'a', rank: 0 }, { value: 'b', rank: 1 } ]
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  console.log('stateNew', stateNew)
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

  // b should exist in the ROOT context
  // expect(getContexts(stateNew, 'b'))
  //   .toMatchObject([{
  //     context: [ROOT_TOKEN],
  //     rank: -1,
  //   }])

})
