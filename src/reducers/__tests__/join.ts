import { HOME_TOKEN } from '../../constants'
import { join } from '../../reducers'
import { exportContext, getChildrenRanked } from '../../selectors'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import { initialState, reducerFlow, removeHome } from '../../util'
import importText from '../importText'

it('joins two simple thoughts', () => {
  const text = `- a
  - m
  - n
- b`
  const steps = [importText({ text }), setCursorFirstMatch(['a', 'm']), join()]

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
  const steps = [importText({ text }), setCursorFirstMatch(['a', 'o']), join()]

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
  const steps = [importText({ text }), setCursorFirstMatch(['a', 'n']), join()]

  const newState = reducerFlow(steps)(initialState())

  const children = getChildrenRanked(newState, ['a', 'm n o'])

  expect(new Set(children.map(child => child.rank)).size).toBe(4)
})
