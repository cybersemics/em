import { HOME_TOKEN } from '../../constants'
import deleteEmptyThought from '../../reducers/deleteEmptyThought'
import newSubthought from '../../reducers/newSubthought'
import newThought from '../../reducers/newThought'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import getContexts from '../../selectors/getContexts'
import getThoughtById from '../../selectors/getThoughtById'
import deleteThoughtAtFirstMatch from '../../test-helpers/deleteThoughtAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import getAllChildrenByContext from '../../test-helpers/getAllChildrenByContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('delete from root', () => {
  // run steps through reducer flow and export as plaintext for readable test
  const state = reducerFlow([newThought('a'), newThought('b')])(initialState())
  const rootChildrenBefore = getAllChildrenByContext(state, [HOME_TOKEN])
  const [thoughtA] = childIdsToThoughts(state, rootChildrenBefore)

  const stateNew = deleteThoughtAtFirstMatch(['b'])(state)

  const rootChildrenAfter = getAllChildrenByContext(stateNew, [HOME_TOKEN])
  expect(rootChildrenAfter).toEqual([thoughtA.id])

  // lexemeIndex
  expect(getContexts(stateNew, 'b')).toEqual([])
})

it('delete descendants of root thought', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('c'), deleteThoughtAtFirstMatch(['a'])]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  // cnntextIndex
  expect(getAllChildrenByContext(stateNew, [HOME_TOKEN])).toEqual([])
  expect(getAllChildrenByContext(stateNew, ['a'])).toEqual([])
  expect(getAllChildrenByContext(stateNew, ['b', 'c'])).toEqual([])

  // lexemeIndex
  expect(getContexts(stateNew, 'a')).toEqual([])
  expect(getContexts(stateNew, 'b')).toEqual([])
  expect(getContexts(stateNew, 'c')).toEqual([])
})

it('delete thought with duplicate child', () => {
  const steps = [newThought('a'), newSubthought('a'), deleteThoughtAtFirstMatch(['a'])]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  // cnntextIndex
  expect(getAllChildrenByContext(stateNew, [HOME_TOKEN])).toEqual([])
  expect(getAllChildrenByContext(stateNew, ['a'])).toEqual([])

  // lexemeIndex
  expect(getContexts(stateNew, 'a')).toEqual([])
})

it('update cursor after thought deletion', () => {
  const steps = [newThought('a'), newSubthought('b')]

  const state = initialState()
  const stateNew = reducerFlow(steps)(state)

  expectPathToEqual(stateNew, stateNew.cursor!, [
    {
      value: 'a',
    },
    {
      value: 'b',
    },
  ])

  const stateAfterDeletion = reducerFlow([deleteThoughtAtFirstMatch(['a', 'b'])])(stateNew)

  expectPathToEqual(stateAfterDeletion, stateAfterDeletion.cursor!, [
    {
      value: 'a',
    },
  ])
})

it('delete the intended empty thought when there are multiple', () => {
  const steps = [newThought(''), newThought('')]

  const state = initialState()
  const stateNew = reducerFlow(steps)(state)
  const rootChildren = getAllChildrenByContext(stateNew, [HOME_TOKEN])
  const thoughtIdToBeDeleted = rootChildren[rootChildren.length - 1]

  const thoughtToBeDeleted = getThoughtById(stateNew, thoughtIdToBeDeleted)

  expect(thoughtToBeDeleted).toBeDefined()

  const stateAfterDeletion = reducerFlow([deleteEmptyThought])(stateNew)

  const thoughtAfterDeletion = getThoughtById(stateAfterDeletion, thoughtIdToBeDeleted)

  expect(thoughtAfterDeletion).toBeUndefined()
})
