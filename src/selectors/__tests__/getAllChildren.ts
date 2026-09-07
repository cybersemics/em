import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import expectThoughts from '../../test-helpers/expectThoughts'
import getAllChildrenAsThoughtsByContext from '../../test-helpers/getAllChildrenAsThoughtsByContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('get root children', () => {
  const steps = [newThought('a'), newThought('b')]

  const stateNew = reducerFlow(steps)(initialState())

  expectThoughts(getAllChildrenAsThoughtsByContext(stateNew, [HOME_TOKEN]), ['a', 'b'])
})

it('get subthoughts', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('c1'), newThought('c2')]

  const stateNew = reducerFlow(steps)(initialState())

  expectThoughts(getAllChildrenAsThoughtsByContext(stateNew, ['a', 'b']), ['c1', 'c2'])
})
