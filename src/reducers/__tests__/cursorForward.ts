import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
// reducers
import cursorBack from '../cursorBack'
import cursorForward from '../cursorForward'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setCursor from '../setCursor'

it('reverse cursorBack', () => {
  const steps = [newThought('a'), newSubthought('b'), cursorBack, cursorForward]

  const stateNew = reducerFlow(steps)(initialState())

  expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
})

it('move to first child if there is no history', () => {
  const steps = [newThought('a'), newSubthought('b'), newThought('c'), setCursorFirstMatch(['a']), cursorForward]

  const stateNew = reducerFlow(steps)(initialState())

  expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
})

it('move to first child if there is no cursor', () => {
  const steps = [newThought('a'), setCursor({ path: null }), cursorForward]

  const stateNew = reducerFlow(steps)(initialState())

  expectPathToEqual(stateNew, stateNew.cursor, ['a'])
})
