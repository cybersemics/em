import { initialState, reducerFlow } from '../../util'
import { HOME_TOKEN } from '../../constants'
import { getDescendantContexts } from '../../selectors'
import { importText, newThought } from '../../reducers'

it('get descendants', () => {
  const text = `
    - a
      - b
        - c
      - d
    - e
      - f
  `
  const state = importText({ text })(initialState())
  const descendantsAll = getDescendantContexts(state, [HOME_TOKEN])
  expect(descendantsAll).toEqual([['a'], ['a', 'b'], ['a', 'b', 'c'], ['a', 'd'], ['e'], ['e', 'f']])

  const descendantsA = getDescendantContexts(state, ['a'])
  expect(descendantsA).toEqual([
    ['a', 'b'],
    ['a', 'b', 'c'],
    ['a', 'd'],
  ])
})

it('get descendants ordered by rank', () => {
  const text = `
    - a
    - b
    - c
  `

  const steps = [importText({ text }), newThought({ value: 'x', insertBefore: true })]

  const state = reducerFlow(steps)(initialState())

  // unordered
  const descendantsUnordered = getDescendantContexts(state, [HOME_TOKEN])
  expect(descendantsUnordered).toEqual([['a'], ['b'], ['c'], ['x']])

  // ordered
  const descendantsOrdered = getDescendantContexts(state, [HOME_TOKEN], { ordered: true })
  expect(descendantsOrdered).toEqual([['a'], ['b'], ['x'], ['c']])
})

it('filter descendants', () => {
  const text = `
    - a
      - b
        - c
      - d
    - e
      - f
        - g
          - h
  `
  const state = importText({ text })(initialState())
  let touched = 0
  const descendantsAll = getDescendantContexts(state, [HOME_TOKEN], {
    // context does not include child
    filterFunction: (child, context) => {
      touched++
      return context.length < 2
    },
  })
  expect(descendantsAll).toEqual([['a'], ['a', 'b'], ['a', 'd'], ['e'], ['e', 'f']])

  // short circuit
  // [e, f, g, h] should never be touched
  expect(touched).toEqual(7)
})
