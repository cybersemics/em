import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import moveThoughtUp from '../moveThoughtUp'
import setCursor from '../setCursor'
import toggleAttribute from '../toggleAttribute'

it('move within root', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    moveThoughtUp,

  ]

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
    moveThoughtUp,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a2
    - a1`)

})

it('move to prev uncle', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought({ value: 'b', at: [{ value: 'a', rank: 0 }] }),
    newSubthought('b1'),
    moveThoughtUp,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1
    - b1
  - b`)

})

it('move to prev uncle in sorted list', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought({ value: 'b', at: [{ value: 'a', rank: 0 }] }),
    toggleAttribute({ context: ['b'], key: '=sort', value: 'Alphabetical' }),
    newSubthought('b1'),
    moveThoughtUp,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1
    - b1
  - b
    - =sort
      - Alphabetical`)

})

it('prevent move in sorted list when there is no previous uncle', () => {

  const steps = [
    newThought('a'),
    toggleAttribute({ context: ['a'], key: '=sort', value: 'Alphabetical' }),
    newSubthought('a1'),
    newThought('a2'),
    moveThoughtUp,
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
    newThought({ value: 'b', at: [{ value: 'a', rank: 0 }] }),
    newSubthought('b1'),
    newSubthought('b1.1'),
    setCursor({ path: [{ value: 'b', rank: 1 }] }),
    moveThoughtUp,
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

  const steps = [
    newThought('a'),
    newThought('b'),
    setCursor({ path: [{ value: 'a', rank: 0 }] }),
    moveThoughtUp,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)

})

it('trying to move first thought of context with no prev uncle should do nothing', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    newSubthought('b1'),
    newSubthought('b1.1'),
    moveThoughtUp,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b
    - b1
      - b1.1`)

})

it('do nothing when there is no cursor', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    setCursor({ path: null }),
    moveThoughtUp,

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
    moveThoughtUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a2', rank: -1 }])

})
