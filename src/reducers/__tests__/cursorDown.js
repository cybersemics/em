import { initialState, reducerFlow } from '../../util'

// reducers
import newThought from '../newThought'
import cursorDown from '../cursorDown'
import setCursor from '../setCursor'

it('move cursor to next sibling', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    cursorDown,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'b', rank: 1 }])

})

it('move cursor from parent first child', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b', insertNewSubthought: true }),
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    cursorDown,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

})

it('move to first root child when there is no cursor', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => setCursor(state, { thoughtsRanked: null }),
    cursorDown,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('do nothing when there are no thoughts', () => {

  const stateNew = cursorDown(initialState())

  expect(stateNew.cursor).toBe(null)

})

it('move cursor to next uncle', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    cursorDown,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'b', rank: 1 }])

})

it('move cursor to nearest uncle', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    state => newThought(state, { value: 'a1.1', insertNewSubthought: true }),
    state => newThought(state, { value: 'a1.1.1', insertNewSubthought: true }),
    cursorDown,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'b', rank: 1 }])

})
