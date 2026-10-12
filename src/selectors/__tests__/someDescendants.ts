import importText from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import someDescendants from '../../selectors/someDescendants'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

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
  const state = runDocumentCommand(importText({ text }), initialState())
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
  const state = runDocumentCommand(importText({ text }), initialState())
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
  const state = runDocumentCommand(importText({ text }), initialState())
  const isDeep = someDescendants(state, HOME_TOKEN, () => false)
  expect(isDeep).toEqual(false)
})
