import cursorDown from '../../actions/cursorDown'
import deleteThoughtWithCursor from '../../actions/deleteThoughtWithCursor'
import newThought from '../../actions/newThought'
import rerank from '../../actions/rerank'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { getChildrenRanked } from '../../selectors/getChildren'
import moveThoughtAtFirstMatch from '../../test-helpers/moveThoughtAtFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

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

  expect(getChildrenRanked(state, HOME_TOKEN)).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 1 },
    { value: 'c', rank: 2 },
    { value: 'd', rank: 3 },
    { value: 'e', rank: 4 },
  ])
})

it('rerank on moveThought if ranks are too close', () => {
  /** Creates a new thought above and deletes the thought below in a way that decreases the new thought's rank. */
  const halveRank = (value: string) =>
    reducerFlow([newThought({ value, insertBefore: true }), cursorDown, deleteThoughtWithCursor({})])

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    // first use the halving technique to create a thought with an extremely small rank
    // ranks becomes too close after about 24 halvings
    ...new Array(25).fill(halveRank('c')),

    // create a new thought above which will create a thought halfway between rank 0 and the extremely small rank
    newThought({ value: 'b', insertBefore: true }),

    // move any thought to trigger a rerank
    moveThoughtAtFirstMatch({
      from: ['a'],
      to: ['a'],
      newRank: 99,
    }),
  ]

  const state = reducerFlow(steps)(initialState())

  expect(getChildrenRanked(state, HOME_TOKEN)).toMatchObject([
    { value: 'b', rank: 0 },
    { value: 'c', rank: 1 },
    { value: 'a', rank: 2 }, // 'a' is still moved to the end of the list
  ])
})
