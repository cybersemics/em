import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { getContexts, getAllChildren, getThoughtByContext } from '../../selectors'
import { newSubthought, newThought } from '../../reducers'
import matchChildIdsWithThoughts from '../../test-helpers/matchPathWithThoughts'
import deleteThoughtAtFirstMatch from '../../test-helpers/deleteThoughtAtFirstMatch'
import { State } from '../../@types'
import { head } from 'lodash'

it('delete from root', () => {
  const steps = [newThought('a'), newThought('b'), deleteThoughtAtFirstMatch(['b'])]

  // run steps through reducer flow and export as plaintext for readable test
  const state = initialState()
  const stateNew = reducerFlow(steps)(state)

  /** Gets the root Parent from a state's thoughtIndex. */
  const thought = getThoughtByContext(stateNew, [HOME_TOKEN])!

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
