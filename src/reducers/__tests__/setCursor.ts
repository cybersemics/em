// TODO: Why does util have to be imported before selectors and reducers?
import { hashContext, initialState, reducerFlow } from '../../util'

import { importText, setCursor, toggleContextView } from '../../reducers'

it('set the cursor to a SimplePath', () => {
  const text = `
    - a
      - b
        - c`

  const cursor = [
    { id: hashContext(['a']), value: 'a', rank: 0 },
    { id: hashContext(['a', 'b']), value: 'b', rank: 0 },
    { id: hashContext(['a', 'b', 'c']), value: 'c', rank: 0 },
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
    { id: hashContext(['a']), value: 'a', rank: 0 },
    { id: hashContext(['a', 'm']), value: 'm', rank: 0 },
    { id: hashContext(['a', 'm', 'b']), value: 'b', rank: 1 },
    { id: hashContext(['a', 'm', 'b', 'y']), value: 'y', rank: 0 },
  ]

  const steps = [importText({ text }), setCursor({ path: cursor }), toggleContextView]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(cursor)
})
