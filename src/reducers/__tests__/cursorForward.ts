import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

// reducers
import cursorBack from '../cursorBack'
import cursorForward from '../cursorForward'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setCursor from '../setCursor'
import matchChildIdsWithThoughts from '../../test-helpers/matchPathWithThoughts'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'

it('reverse cursorBack', () => {
  const steps = [newThought('a'), newSubthought('b'), cursorBack, cursorForward]

  const stateNew = reducerFlow(steps)(initialState())

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
  ])
})

it('move to first child if there is no history', () => {
  const steps = [newThought('a'), newSubthought('b'), newThought('c'), setCursorFirstMatch(['a']), cursorForward]

  const stateNew = reducerFlow(steps)(initialState())

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
  ])
})

it('move to first child if there is no cursor', () => {
  const steps = [newThought('a'), setCursor({ path: null }), cursorForward]

  const stateNew = reducerFlow(steps)(initialState())

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'a', rank: 0 }])
})
