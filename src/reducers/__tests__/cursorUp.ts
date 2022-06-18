import initialState from '../../util/initialState'
import pathToContext from '../../util/pathToContext'
import reducerFlow from '../../util/reducerFlow'
import cursorUp from '../../reducers/cursorUp'
import importText from '../../reducers/importText'
import newSubthought from '../../reducers/newSubthought'
import newThought from '../../reducers/newThought'
import setCursor from '../../reducers/setCursor'
import toggleContextView from '../../reducers/toggleContextView'
import toggleHiddenThoughts from '../../reducers/toggleHiddenThoughts'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToPath from '../../selectors/contextToPath'
import State from '../../@types/State'

it('move cursor to previous sibling', () => {
  const steps = [newThought('a'), newThought('b'), cursorUp]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a'])!)
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

  const thoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

  expect(thoughts).toMatchObject([
    { value: 'a', rank: 0 },
    { value: '=test', rank: 1 },
  ])
})

it('move cursor from first child to parent', () => {
  const steps = [newThought('a'), newSubthought('b'), cursorUp]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a'])!)
})

it('move to last root child when there is no cursor', () => {
  const steps = [newThought('a'), newThought('b'), setCursor({ path: null }), cursorUp]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['b'])!)
})

it('do nothing when there are no thoughts', () => {
  const stateNew = cursorUp(initialState())

  expect(stateNew.cursor).toBe(null)
})

// @MIGRATION_TODO: Context view is not working yet.
describe.skip('context view', () => {
  it("move cursor from context's first child to parent", () => {
    const text = `- a
      - m
        - x
    - b
      - m
        - y`

    const steps = [
      importText({ text }),
      (state: State) => setCursor(state, { path: contextToPath(state, ['a', 'm']) }),
      toggleContextView,
      (state: State) => setCursor(state, { path: contextToPath(state, ['a', 'm', 'a']) }),
      cursorUp,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toBeDefined()
    expect(pathToContext(stateNew, stateNew.cursor!)).toMatchObject(['a', 'm'])
  })
})
