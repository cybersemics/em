// TODO: Why does util have to be imported before selectors and reducers?
import { hashContext, initialState, reducerFlow } from '../../util'
import { importText, setCursor, toggleContextView } from '../../reducers'
import { State } from '../../@types'

it('set the cursor to a SimplePath', () => {
  const text = `
    - a
      - b
        - c`

  const steps = [
    importText({ text }),
    (newState: State) =>
      setCursor(newState, {
        path: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'b']) || '', value: 'b', rank: 0 },
          { id: hashContext(newState, ['a', 'b', 'c']) || '', value: 'c', rank: 0 },
        ],
      }),
    toggleContextView,
  ]

  const expectedCursor = [
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
    { value: 'c', rank: 0 },
  ]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(expectedCursor)
})

it('set the cursor to a Path across a context view', () => {
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
        path: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'm']) || '', value: 'm', rank: 0 },
          { id: hashContext(newState, ['a', 'm', 'b']) || '', value: 'b', rank: 1 },
          { id: hashContext(newState, ['a', 'm', 'b', 'y']) || '', value: 'y', rank: 0 },
        ],
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

  expect(stateNew.cursor).toMatchObject(expectedCursor)
})
