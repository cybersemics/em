import importText from '../../actions/importText'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import initStore from '../../test-helpers/initStore'
import reducerFlow from '../../test-helpers/reducerFlow'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import getFirstChildPlacement from '../getFirstChildPlacement'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('places before all visible children', () => {
  const steps = [newThought('a'), newSubthought('b'), newThought('c')]

  const stateNew = reducerFlow(steps)(initialState())

  const id = contextToThoughtId(stateNew, ['a'])
  expect(getFirstChildPlacement(stateNew, id!)).toBeNull()
})

it('places before visible children but after leading hidden children', () => {
  const text = `
    - a
      - =archive
      - b
      - c
  `
  const stateNew = runDocumentCommand(importText({ text }), initialState())
  const id = contextToThoughtId(stateNew, ['a'])
  expect(getFirstChildPlacement(stateNew, id!)).toBe(contextToThoughtId(stateNew, ['a', '=archive']))
})

it('places after the last hidden child when all children are hidden', () => {
  const steps = [newThought('a'), newSubthought('=b'), newThought('=c')]

  const stateNew = reducerFlow(steps)(initialState())
  const id = contextToThoughtId(stateNew, ['a'])
  expect(getFirstChildPlacement(stateNew, id!)).toBe(contextToThoughtId(stateNew, ['a', '=c']))
})

it('places before hidden children with aboveMeta: true', () => {
  const steps = [newThought('a'), newSubthought('=b'), newThought('=c')]

  const stateNew = reducerFlow(steps)(initialState())
  const id = contextToThoughtId(stateNew, ['a'])
  expect(getFirstChildPlacement(stateNew, id!, { aboveMeta: true })).toBeNull()
})
