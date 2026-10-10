import SimplePath from '../../@types/SimplePath'
import importText from '../../actions/importText'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import contextToPath from '../contextToPath'
import isBefore from '../isBefore'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('top-level thought is before its next sibling', () => {
  const stateNew = runDocumentCommand(importText({ text: '- a\n- b' }), initialState())
  const a = contextToPath(stateNew, ['a']) as SimplePath
  const b = contextToPath(stateNew, ['b']) as SimplePath

  expect(isBefore(stateNew, a, b)).toBeTruthy()
  expect(isBefore(stateNew, b, a)).toBeFalsy()
})

it('subthought is before its next sibling', () => {
  const stateNew = runDocumentCommand(importText({ text: '- a\n  - b\n  - c' }), initialState())
  const b = contextToPath(stateNew, ['a', 'b']) as SimplePath
  const c = contextToPath(stateNew, ['a', 'c']) as SimplePath

  expect(isBefore(stateNew, b, c)).toBeTruthy()
  expect(isBefore(stateNew, c, b)).toBeFalsy()
})

it('thoughts in different contexts are not before each other', () => {
  const stateNew = runDocumentCommand(importText({ text: '- a\n  - b\n- c' }), initialState())
  const b = contextToPath(stateNew, ['a', 'b']) as SimplePath
  const c = contextToPath(stateNew, ['c']) as SimplePath

  expect(isBefore(stateNew, b, c)).toBeFalsy()
})
