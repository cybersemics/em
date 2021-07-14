import { HOME_TOKEN } from '../../constants'
import { newSubthought, newThought } from '../../reducers'
import { getAllChildren } from '../../selectors'
import { initialState, reducerFlow } from '../../util'

it('get root children', () => {
  const steps = [newThought('a'), newThought('b')]

  const stateNew = reducerFlow(steps)(initialState())

  expect(getAllChildren(stateNew, [HOME_TOKEN])).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 1 },
  ])
})

it('get subthoughts', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('c1'), newThought('c2')]

  const stateNew = reducerFlow(steps)(initialState())

  expect(getAllChildren(stateNew, ['a', 'b'])).toMatchObject([
    { value: 'c1', rank: 0 },
    { value: 'c2', rank: 1 },
  ])
})
