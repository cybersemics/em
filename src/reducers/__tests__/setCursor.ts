// TODO: Why does util have to be imported before selectors and reducers?
import { createId, initialState, reducerFlow } from '../../util'

import { importText, setCursor, toggleContextView } from '../../reducers'

it('set the cursor to a SimplePath', () => {
  const text = `
    - a
      - b
        - c`

  const cursor = [
    { id: createId(), value: 'a', rank: 0 },
    { id: createId(), value: 'b', rank: 0 },
    { id: createId(), value: 'c', rank: 0 },
  ]

  const steps = [importText({ text }), setCursor({ path: cursor }), toggleContextView]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(cursor)
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

  const cursor = [
    { id: createId(), value: 'a', rank: 0 },
    { id: createId(), value: 'm', rank: 0 },
    { id: createId(), value: 'b', rank: 1 },
    { id: createId(), value: 'y', rank: 0 },
  ]

  const steps = [importText({ text }), setCursor({ path: cursor }), toggleContextView]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(cursor)
})
