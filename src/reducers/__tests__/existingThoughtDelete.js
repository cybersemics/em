import { NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext, getContexts, getThoughts } from '../../selectors'
import { importText } from '../../action-creators'
import { existingThoughtDelete, newThought, setCursor, updateThoughts } from '../../reducers'

it('delete from root', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => existingThoughtDelete(state, {
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
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b', insertNewSubthought: true }),
    state => newThought(state, { value: 'c', insertNewSubthought: true }),
    state => existingThoughtDelete(state, {
      context: [ROOT_TOKEN],
      thoughtRanked: { value: 'a', rank: 0 },
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  // cnntextIndex
  expect(getThoughts(stateNew, [ROOT_TOKEN])).toEqual([])
  expect(getThoughts(stateNew, ['a'])).toEqual([])
  expect(getThoughts(stateNew, ['b', 'c'])).toEqual([])

  // thoughtIndex
  expect(getContexts(stateNew, 'a')).toEqual([])
  expect(getContexts(stateNew, 'b')).toEqual([])
  expect(getContexts(stateNew, 'c')).toEqual([])

})
