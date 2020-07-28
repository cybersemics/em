import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { getContexts, getThoughts } from '../../selectors'
import { existingThoughtDelete, newSubthought, newThought } from '../../reducers'

it('delete from root', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    existingThoughtDelete({
      context: [ROOT_TOKEN],
      thoughtRanked: { value: 'b', rank: 1 },
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  // cnntextIndex
  expect(getThoughts(stateNew, [ROOT_TOKEN]))
    .toMatchObject([
      { value: 'a', rank: 0 }
    ])

  // thoughtIndex
  expect(getContexts(stateNew, 'b'))
    .toEqual([])

})

it('delete descendants of root thought', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newSubthought('c'),
    existingThoughtDelete({
      context: [ROOT_TOKEN],
      thoughtRanked: { value: 'a', rank: 0 },
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  // cnntextIndex
  expect(getThoughts(stateNew, [ROOT_TOKEN])).toEqual([])
  expect(getThoughts(stateNew, ['a'])).toEqual([])
  expect(getThoughts(stateNew, ['b', 'c'])).toEqual([])

  // thoughtIndex
  expect(getContexts(stateNew, 'a')).toEqual([])
  expect(getContexts(stateNew, 'b')).toEqual([])
  expect(getContexts(stateNew, 'c')).toEqual([])

})

it('delete thought with duplicate child', () => {

  const steps = [
    newThought('a'),
    newSubthought('a'),
    existingThoughtDelete({
      context: [ROOT_TOKEN],
      thoughtRanked: { value: 'a', rank: 0 },
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  // cnntextIndex
  expect(getThoughts(stateNew, [ROOT_TOKEN])).toEqual([])
  expect(getThoughts(stateNew, ['a'])).toEqual([])

  // thoughtIndex
  expect(getContexts(stateNew, 'a')).toEqual([])

})
