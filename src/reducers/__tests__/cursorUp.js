import { initialState, pathToContext, reducerFlow } from '../../util'
import { NOOP, RANKED_ROOT } from '../../constants'
import { importText } from '../../action-creators'
import { cursorUp, newThought, setCursor, toggleContextView, updateThoughts } from '../../reducers'
import { rankThoughtsFirstMatch } from '../../selectors'

it('move cursor to previous sibling', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    cursorUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('move cursor from first child to parent', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b', insertNewSubthought: true }),
    cursorUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('move to last root child when there is no cursor', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => setCursor(state, { thoughtsRanked: null }),
    cursorUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'b', rank: 1 }])

})

it('do nothing when there are no thoughts', () => {

  const stateNew = cursorUp(initialState())

  expect(stateNew.cursor).toBe(null)

})

describe('context view', () => {

  it(`move cursor from context's first child to parent`, async () => {

    const text = `- a
  - m
    - x
- b
  - m
    - y`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      state => updateThoughts(state, thoughts),
      state => setCursor(state, { thoughtsRanked: rankThoughtsFirstMatch(state, ['a', 'm']) }),
      toggleContextView,
      state => setCursor(state, { thoughtsRanked: rankThoughtsFirstMatch(state, ['a', 'm', 'a']) }),
      cursorUp,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(pathToContext(stateNew.cursor))
      .toMatchObject(['a', 'm'])

  })

})
