import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { getContexts, getAllChildren, contextToThought, getThoughtById } from '../../selectors'
import { newSubthought, newThought, deleteEmptyThought } from '../../reducers'
import matchChildIdsWithThoughts from '../../test-helpers/matchPathWithThoughts'
import deleteThoughtAtFirstMatch from '../../test-helpers/deleteThoughtAtFirstMatch'

it('delete from root', () => {
  const steps = [newThought('a'), newThought('b'), deleteThoughtAtFirstMatch(['b'])]

  // run steps through reducer flow and export as plaintext for readable test
  const state = initialState()
  const stateNew = reducerFlow(steps)(state)

  /** Gets the root Parent from a state's thoughtIndex. */
  const thought = contextToThought(stateNew, [HOME_TOKEN])!

  // thoughtIndex
  matchChildIdsWithThoughts(stateNew, thought.children, [
    {
      value: 'a',
    },
  ])

  // lexemeIndex
  expect(getContexts(stateNew, 'b')).toEqual([])
})

it('delete descendants of root thought', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('c'), deleteThoughtAtFirstMatch(['a'])]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  // cnntextIndex
  expect(getAllChildren(stateNew, [HOME_TOKEN])).toEqual([])
  expect(getAllChildren(stateNew, ['a'])).toEqual([])
  expect(getAllChildren(stateNew, ['b', 'c'])).toEqual([])

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
  expect(getAllChildren(stateNew, [HOME_TOKEN])).toEqual([])
  expect(getAllChildren(stateNew, ['a'])).toEqual([])

  // lexemeIndex
  expect(getContexts(stateNew, 'a')).toEqual([])
})

it('update cursor after thought deletion', () => {
  const steps = [newThought('a'), newSubthought('b')]

  const state = initialState()
  const stateNew = reducerFlow(steps)(state)

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [
    {
      value: 'a',
    },
    {
      value: 'b',
    },
  ])

  const stateAfterDeletion = reducerFlow([deleteThoughtAtFirstMatch(['a', 'b'])])(stateNew)

  matchChildIdsWithThoughts(stateAfterDeletion, stateAfterDeletion.cursor!, [
    {
      value: 'a',
    },
  ])
})

it('delete the intended empty thought when there are multiple', () => {
  const steps = [newThought(''), newThought('')]

  const state = initialState()
  const stateNew = reducerFlow(steps)(state)
  const rootChildren = getAllChildren(stateNew, [HOME_TOKEN])
  const thoughtIdToBeDeleted = rootChildren[rootChildren.length - 1]

  const thoughtToBeDeleted = getThoughtById(stateNew, thoughtIdToBeDeleted)

  expect(thoughtToBeDeleted).toBeDefined()

  const stateAfterDeletion = reducerFlow([deleteEmptyThought])(stateNew)

  const thoughtAfterDeletion = getThoughtById(stateAfterDeletion, thoughtIdToBeDeleted)

  expect(thoughtAfterDeletion).toBeUndefined()
})
