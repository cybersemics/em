import { initialState, pathToContext, reducerFlow } from '../../util'
import { NOOP, RANKED_ROOT } from '../../constants'
import { importText } from '../../action-creators'
import { cursorUp, newSubthought, newThought, setCursor, toggleContextView, toggleHiddenThoughts, updateThoughts } from '../../reducers'
import { rankThoughtsFirstMatch } from '../../selectors'

it('move cursor to previous sibling', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    cursorUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('move cursor to previous attribute when showHiddenThoughts is true', () => {

  const steps = [
    toggleHiddenThoughts,
    newThought('a'),
    newSubthought('b'),
    newThought('=test'),
    newThought('c'),
    cursorUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: '=test', rank: 1 }])

})

it('move cursor from first child to parent', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    cursorUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('move to last root child when there is no cursor', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    setCursor({ thoughtsRanked: null }),
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
      updateThoughts(thoughts),
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
