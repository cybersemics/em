import { initialState, reducerFlow, removeRoot } from '../../util'
import { join } from '../../reducers'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import importText from '../importText'
import { exportContext } from '../../selectors'

it('joins two simple thoughts', () => {
  const text = `- a
  - m
  - n
- b`
  const steps = [
    importText({ path: RANKED_ROOT, text }),
    setCursorFirstMatch(['a', 'm']),
    join()
  ]

  const newState = reducerFlow(steps)(initialState())
  const exported = exportContext(newState, [ROOT_TOKEN], 'text/plain')
  const expectedOutput = `
- a
  - m n
- b
`
  expect(removeRoot(exported)).toEqual(expectedOutput)
})

it('joins two thoughts and merges their children', () => {
  const text = `- a
  - m
    - x
  - n
    - y
  - o
    - z
- b`
  const steps = [
    importText({ path: RANKED_ROOT, text }),
    setCursorFirstMatch(['a', 'n']),
    join()
  ]

  const newState = reducerFlow(steps)(initialState())
  const exported = exportContext(newState, [ROOT_TOKEN], 'text/plain')
  const expectedOutput = `
- a
  - m n o
    - x
    - y
    - z
- b
`
  expect(removeRoot(exported)).toEqual(expectedOutput)
})
