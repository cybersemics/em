import join from '../../actions/join'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import getChildrenRankedByContext from '../../test-helpers/getChildrenRankedByContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import removeHome from '../../util/removeHome'
import importText from '../importText'

it('joins two simple thoughts', () => {
  const text = `
    - a
      - m
      - n
    - b
  `
  const steps = [importText({ text }), setCursor(['a', 'm']), join()]

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
  const text = `
    - a
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
    - b
  `
  const steps = [importText({ text }), setCursor(['a', 'o']), join()]

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
  const text = `
    - a
      - m
        - a
        - b
      - n
        - c
      - o
        - d
    - b
  `
  const steps = [importText({ text }), setCursor(['a', 'n']), join()]

  const newState = reducerFlow(steps)(initialState())

  const children = getChildrenRankedByContext(newState, ['a', 'm n o'])

  expect(new Set(children.map(child => child.rank)).size).toBe(4)
})
