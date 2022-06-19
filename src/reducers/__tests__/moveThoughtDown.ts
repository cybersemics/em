import { HOME_TOKEN } from '../../constants'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import State from '../../@types/State'

// reducers
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import moveThoughtDown from '../moveThoughtDown'
import setCursor from '../setCursor'
import toggleAttribute from '../toggleAttribute'
import newThoughtAtFirstMatch from '../../test-helpers/newThoughtAtFirstMatch'
import contextToPath from '../../selectors/contextToPath'

it('move within root', () => {
  const steps = [newThought('a'), newThought('b'), setCursorFirstMatch(['a']), moveThoughtDown]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
  - a`)
})

it('move within context', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    setCursorFirstMatch(['a', 'a1']),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a2
    - a1`)
})

it('move to next uncle', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThoughtAtFirstMatch({
      value: 'b',
      at: [HOME_TOKEN],
    }),
    newSubthought('b1'),
    setCursorFirstMatch(['a', 'a1']),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b
    - a1
    - b1`)
})

it('move to next uncle in sorted list', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      toggleAttribute(state, { path: contextToPath(state, ['a']), key: '=sort', value: 'Alphabetical' }),
    newSubthought('a1'),
    newThought('a2'),
    newThoughtAtFirstMatch({
      value: 'b',
      at: ['a'],
    }),
    setCursorFirstMatch(['a', 'a1']),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =sort
      - Alphabetical
    - a2
  - b
    - a1`)
})

it('prevent move in sorted list when there is no next uncle', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      toggleAttribute(state, { path: contextToPath(state, ['a']), key: '=sort', value: 'Alphabetical' }),
    newSubthought('a1'),
    newThought('a2'),
    setCursorFirstMatch(['a', 'a1']),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =sort
      - Alphabetical
    - a1
    - a2`)
})
it('move descendants', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newSubthought('a1.1'),
    newThoughtAtFirstMatch({
      value: 'b',
      at: ['a'],
    }),
    newSubthought('b1'),
    newSubthought('b1.1'),
    setCursorFirstMatch(['a']),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
    - b1
      - b1.1
  - a
    - a1
      - a1.1`)
})

it('trying to move last thought of root should do nothing', () => {
  const steps = [newThought('a'), newThought('b'), moveThoughtDown]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
})

it('trying to move last thought of context with no next uncle should do nothing', () => {
  const steps = [
    newThought('a'),
    newThought('b'),
    setCursorFirstMatch(['a']),
    newSubthought('a1'),
    newSubthought('a1.1'),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1
      - a1.1
  - b`)
})

it('do nothing when there is no cursor', () => {
  const steps = [
    newThought('a'),
    newThought('b'),
    (newState: State) => setCursor(newState, { path: null }),
    moveThoughtDown,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
})

it('move cursor thought should update cursor', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    setCursorFirstMatch(['a', 'a1']),
    moveThoughtDown,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  const thoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

  expect(thoughts).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'a1', rank: 2 },
  ])
})
