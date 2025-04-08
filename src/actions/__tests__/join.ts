import join from '../../actions/join'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import getChildrenRankedByContext from '../../test-helpers/getChildrenRankedByContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import removeHome from '../../util/removeHome'
import importText from '../importText'
import moveThoughtUp from '../moveThoughtUp'

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

it('joins thoughts in the root', () => {
  const text = `
    - a
    - b
  `
  const steps = [importText({ text }), setCursor(['a']), join()]

  const newState = reducerFlow(steps)(initialState())
  const exported = exportContext(newState, [HOME_TOKEN], 'text/plain')
  const expectedOutput = `
- a b
`
  expect(removeHome(exported)).toEqual(expectedOutput)
})

it('joins thoughts in rank order', () => {
  const text = `
    - a
      - n
      - m
  `
  const steps = [importText({ text }), setCursor(['a', 'm']), moveThoughtUp, join()]

  const newState = reducerFlow(steps)(initialState())
  const exported = exportContext(newState, [HOME_TOKEN], 'text/plain')
  const expectedOutput = `
- a
  - m n
`
  expect(removeHome(exported)).toEqual(expectedOutput)
})

it('ignores metaprogramming attributes', () => {
  const text = `
    - a
      - =test
      - m
      - n
  `
  const steps = [importText({ text }), setCursor(['a', 'm']), join()]

  const newState = reducerFlow(steps)(initialState())
  const exported = exportContext(newState, [HOME_TOKEN], 'text/plain')
  const expectedOutput = `
- a
  - =test
  - m n
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

it('generates unique and non-conflicting ranks', () => {
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

it('removes trailing hyphens', () => {
  const text = `
    - Manufacture -> Deposition
      - in an
      - alternative perspective, the life histories of things do not end with depo-
      - sition
  `
  const steps = [importText({ text }), setCursor(['Manufacture -> Deposition', 'in an']), join()]

  const newState = reducerFlow(steps)(initialState())
  const exported = exportContext(newState, [HOME_TOKEN], 'text/plain')
  const expectedOutput = `
- Manufacture -> Deposition
  - in an alternative perspective, the life histories of things do not end with deposition
`
  expect(removeHome(exported)).toEqual(expectedOutput)
})
