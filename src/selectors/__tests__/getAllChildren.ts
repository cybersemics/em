import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import getAllChildrenAsThoughtsByContext from '../../test-helpers/getAllChildrenAsThoughtsByContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('get root children', () => {
  const steps = [newThought('a'), newThought('b')]

  const stateNew = reducerFlow(steps)(initialState())

  expect(getAllChildrenAsThoughtsByContext(stateNew, [HOME_TOKEN])).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 1 },
  ])
})

it('get subthoughts', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('c1'), newThought('c2')]

  const stateNew = reducerFlow(steps)(initialState())

  expect(getAllChildrenAsThoughtsByContext(stateNew, ['a', 'b'])).toMatchObject([
    { value: 'c1', rank: 0 },
    { value: 'c2', rank: 1 },
  ])
})
