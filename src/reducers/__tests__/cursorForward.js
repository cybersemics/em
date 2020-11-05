import { initialState, reducerFlow } from '../../util'

// reducers
import cursorBack from '../cursorBack'
import cursorForward from '../cursorForward'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setCursor from '../setCursor'

it('reverse cursorBack', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    cursorBack,
    cursorForward,
  ]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

})

it('move to first child if there is no history', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newThought('c'),
    setCursor({ path: [{ value: 'a', rank: 0 }] }),
    cursorForward,
  ]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

})

it('move to first child if there is no cursor', () => {

  const steps = [
    newThought('a'),
    setCursor({ path: null }),
    cursorForward,
  ]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})
