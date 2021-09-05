import { initialState } from '../../util'
import { HOME_TOKEN } from '../../constants'
import { someDescendants } from '../../selectors'
import { importText } from '../../reducers'

it('return true if at least one descendant fulfills the predicate', () => {
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
  const isDeep = someDescendants(
    state,
    [HOME_TOKEN],
    // context does not include child
    (child, context) => context.length > 1,
  )
  expect(isDeep).toEqual(true)
})

it('short circuit after the predicate is found', () => {
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
  someDescendants(state, [HOME_TOKEN], (child, context) => {
    touched++
    // context does not include child
    return context.length > 1
  })

  // short circuit
  // g and h are never touched because c is found
  expect(touched).toEqual(6)
})

it('return false if no descendant fulfills the predicate', () => {
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
  const isDeep = someDescendants(
    state,
    [HOME_TOKEN],
    // context does not include child
    (child, context) => context.length > 99,
  )
  expect(isDeep).toEqual(false)
})
