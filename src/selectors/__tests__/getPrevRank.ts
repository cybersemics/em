import { initialState, reducerFlow } from '../../util'
import { getAllChildren } from '../../selectors'
import { newSubthought, newThought, cursorBack } from '../../reducers'
import getPrevRank from '../getPrevRank'

it('getPrevRank when all the thoughts in the context are hidden', () => {

  const steps = [
    newThought('a'),
    newSubthought('=archive'),
    cursorBack
  ]

  const stateNew = reducerFlow(steps)(initialState())

  const children = getAllChildren(stateNew, ['a'])

  expect(getPrevRank(stateNew, ['a'])).toBeLessThan(children[0].rank)

})
