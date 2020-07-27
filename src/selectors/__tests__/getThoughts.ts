import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { getThoughts } from '../../selectors'
import { newThought, newSubthought, setCursor } from '../../reducers'

it('get root children', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
  ]

  const stateNew = reducerFlow(steps)(initialState())

  expect(getThoughts(stateNew, [ROOT_TOKEN]))
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 1 }])

})

it('get subthoughts', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newSubthought('c1'),
    newThought('c2'),
  ]

  const stateNew = reducerFlow(steps)(initialState())

  expect(getThoughts(stateNew, ['a', 'b']))
    .toMatchObject([{ value: 'c1', rank: 0 }, { value: 'c2', rank: 1 }])

})
