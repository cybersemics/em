import { HOME_TOKEN } from '../../constants'
import { initialState, parentOf, reducerFlow } from '../../util'
import { getContexts, getAllChildren, getParent, getThoughtByPath, rankThoughtsFirstMatch } from '../../selectors'
import { newSubthought, newThought, deleteThought } from '../../reducers'
import matchChildIdsWithThoughts from '../../test-helpers/matchPathWithThoughts'
import { State } from '../../@types'
import _ from 'lodash'

/**
 * Delete thought at the given unranked path first matched.
 */
const deleteThoughtAtFirstMatch = _.curryRight((state: State, at: string[]) => {
  const path = rankThoughtsFirstMatch(state, at)

  if (!path) throw new Error(`Ranked thoughts not found for context: ${at}`)

  const thought = getThoughtByPath(state, path)

  const context = at.length > 1 ? parentOf(at) : [HOME_TOKEN]

  return deleteThought(state, {
    context,
    thoughtId: thought.id,
  })
})

it('delete from root', () => {
  const steps = [newThought('a'), newThought('b'), deleteThoughtAtFirstMatch(['b'])]

  // run steps through reducer flow and export as plaintext for readable test
  const state = initialState()
  const stateNew = reducerFlow(steps)(state)

  /** Gets the root Parent from a state's contextIndex. */
  const rootParent = getParent(stateNew, [HOME_TOKEN])!

  // contextIndex
  matchChildIdsWithThoughts(stateNew, rootParent.children, [
    {
      value: 'a',
    },
  ])

  // thoughtIndex
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

  // thoughtIndex
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

  // thoughtIndex
  expect(getContexts(stateNew, 'a')).toEqual([])
})
