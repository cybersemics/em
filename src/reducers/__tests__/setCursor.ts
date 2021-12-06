// TODO: Why does util have to be imported before selectors and reducers?
import { initialState, reducerFlow } from '../../util'
import { importText, setCursor, toggleContextView } from '../../reducers'
import { State } from '../../@types'
import { childIdsToThoughts, rankThoughtsFirstMatch } from '../../selectors'

it('set the cursor to a SimplePath', () => {
  const text = `
    - a
      - b
        - c`

  const steps = [
    importText({ text }),
    (newState: State) =>
      setCursor(newState, {
        path: rankThoughtsFirstMatch(newState, ['a', 'b', 'c']),
      }),
    toggleContextView,
  ]

  const expectedCursor = [
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
    { value: 'c', rank: 0 },
  ]

  const stateNew = reducerFlow(steps)(initialState())

  const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)
  expect(cursorThoughts).toMatchObject(expectedCursor)
})

// @MIGRATION_TODO: Skipped until context view is figured out.
it.skip('set the cursor to a Path across a context view', () => {
  const text = `
    - a
      - m
        - x
    - b
      - m
        - y
  `

  const steps = [
    importText({ text }),
    (newState: State) =>
      setCursor(newState, {
        path: rankThoughtsFirstMatch(newState, ['a', 'm', 'b', 'y']),
      }),
    toggleContextView,
  ]

  const stateNew = reducerFlow(steps)(initialState())

  const expectedCursor = [
    { value: 'a', rank: 0 },
    { value: 'm', rank: 0 },
    { value: 'b', rank: 1 },
    { value: 'y', rank: 0 },
  ]

  const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

  expect(cursorThoughts).toMatchObject(expectedCursor)
})
