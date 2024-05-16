import importText from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import someDescendants from '../../selectors/someDescendants'
import initialState from '../../util/initialState'

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
  const isDeep = someDescendants(state, HOME_TOKEN, thought => thought.value === 'c')
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
  someDescendants(state, HOME_TOKEN, thought => {
    touched++
    return thought.value === 'c'
  })

  // short circuit
  // g and h are never touched when c is found
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
  const isDeep = someDescendants(state, HOME_TOKEN, thought => false)
  expect(isDeep).toEqual(false)
})
