import { initialState, pathToContext, reducerFlow } from '../../util'
import { HOME_PATH } from '../../constants'
import { cursorUp, importText, newSubthought, newThought, setCursor, toggleContextView, toggleHiddenThoughts } from '../../reducers'
import { rankThoughtsFirstMatch } from '../../selectors'
import { State } from '../../util/initialState'

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
    setCursor({ path: null }),
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

  it(`move cursor from context's first child to parent`, () => {

    const text = `- a
      - m
        - x
    - b
      - m
        - y`

    const steps = [
      importText({ path: HOME_PATH, text }),
      (state: State) => setCursor(state, { path: rankThoughtsFirstMatch(state, ['a', 'm']) }),
      toggleContextView,
      (state: State) => setCursor(state, { path: rankThoughtsFirstMatch(state, ['a', 'm', 'a']) }),
      cursorUp,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(pathToContext(stateNew.cursor || []))
      .toMatchObject(['a', 'm'])

  })

})
