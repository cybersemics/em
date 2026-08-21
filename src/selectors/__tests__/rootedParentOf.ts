import Path from '../../@types/Path'
import ThoughtId from '../../@types/ThoughtId'
import { EM_PATH, EM_TOKEN, HOME_PATH } from '../../constants'
import initialState from '../../util/initialState'
import rootedParentOf from '../rootedParentOf'

it('return HOME_PATH for a top-level path in the home root', () => {
  expect(rootedParentOf(initialState(), ['a' as ThoughtId] as Path)).toEqual(HOME_PATH)
})

it('return EM_PATH for a top-level path when the EM context is the outline root', () => {
  const state = { ...initialState(), rootContext: [EM_TOKEN] }
  expect(rootedParentOf(state, ['a' as ThoughtId] as Path)).toEqual(EM_PATH)
})

it('return the parent of an explicit EM path', () => {
  const state = { ...initialState(), rootContext: [EM_TOKEN] }
  expect(rootedParentOf(state, [EM_TOKEN, 'a' as ThoughtId] as Path)).toEqual([EM_TOKEN])
})
