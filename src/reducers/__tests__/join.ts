import { initialState, reducerFlow, removeHome } from '../../util'
import { join } from '../../reducers'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import importText from '../importText'
import { exportContext, getChildrenRanked } from '../../selectors'

it('joins two simple thoughts', () => {
  const text = `- a
  - m
  - n
- b`
  const steps = [
    importText({ path: HOME_PATH, text }),
    setCursorFirstMatch(['a', 'm']),
    join()
  ]

  const newState = reducerFlow(steps)(initialState())
  const exported = exportContext(newState, [HOME_TOKEN], 'text/plain')
  const expectedOutput = `
- a
  - m n
- b
`
  expect(removeHome(exported)).toEqual(expectedOutput)
})

it('joins two thoughts and merges their children', () => {
  const text = `- a
  - m
    - a
    - b
  - n
    - c
  - o
    - d
  - p
    - e
    - f
- b`
  const steps = [
    importText({ path: HOME_PATH, text }),
    setCursorFirstMatch(['a', 'o']),
    join()
  ]

  const newState = reducerFlow(steps)(initialState())

  const exported = exportContext(newState, [HOME_TOKEN], 'text/plain')
  const expectedOutput = `
- a
  - m n o p
    - a
    - b
    - c
    - d
    - e
    - f
- b
`
  expect(removeHome(exported)).toEqual(expectedOutput)

})

it('generates unique & non-conflicting ranks', () => {
  const text = `- a
  - m
    - a
    - b
  - n
    - c
  - o
    - d
- b`
  const steps = [
    importText({ path: HOME_PATH, text }),
    setCursorFirstMatch(['a', 'n']),
    join()
  ]

  const newState = reducerFlow(steps)(initialState())

  const children = getChildrenRanked(newState, ['a', 'm n o'])

  expect(new Set(children.map(child => child.rank)).size).toBe(4)

})
