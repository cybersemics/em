import { initialState, reducerFlow } from '../../util'
import { newThought, rerank } from '../../reducers'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import importText from '../importText'
import { exportContext, getChildrenRanked } from '../../selectors'

it('recalculate absolute ranks while preserving relative order to avoid rank precision errors', () => {
  // add two thoughts normally then use insertBefore to cut the rank in half
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'e' }),
    newThought({ value: 'd', insertBefore: true }),
    newThought({ value: 'c', insertBefore: true }),
    newThought({ value: 'b', insertBefore: true }),
    rerank(HOME_PATH),
  ]

  const state = reducerFlow(steps)(initialState())

  expect(getChildrenRanked(state, [HOME_TOKEN])).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 1 },
    { value: 'c', rank: 2 },
    { value: 'd', rank: 3 },
    { value: 'e', rank: 4 },
  ])
})
