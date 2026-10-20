import Path from '../../@types/Path'
import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import initStore from '../../test-helpers/initStore'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import hashPath from '../../util/hashPath'
import splitChain from '../splitChain'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)
afterEach(vi.restoreAllMocks)

it.each([false, true])('avoids document reads for a simple path (unrelated context view: %s)', unrelatedContextView => {
  store.dispatch(importText({ text: '- a\n  - b\n- c', preventSetCursor: true }))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const b = contextToThought(state, ['a', 'b'])!
  const c = contextToThought(state, ['c'])!
  const path = [a.id, b.id] as Path
  const getThought = vi.spyOn(state.thoughts, 'getThought')

  const result = splitChain({ ...state, contextViews: unrelatedContextView ? { [hashPath([c.id])]: true } : {} }, path)

  expect(result).toEqual([path])
  expect(getThought).not.toHaveBeenCalled()
})
