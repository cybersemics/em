import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'
import { bumpThoughtDown, cursorBack, newSubthought, newThought } from '../index'

it('bump leaf', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    bumpThoughtDown({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - ${''}
      - b`)

})

it('cursor should stay in empty thought', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    bumpThoughtDown({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }, { value: '', rank: -1 }])

})

it('bump thought with children', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newSubthought('c'),
    cursorBack,
    bumpThoughtDown({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - ${''}
      - b
      - c`)

})

it('bump thought with children multiple times', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newSubthought('c'),
    cursorBack,
    bumpThoughtDown({}),
    bumpThoughtDown({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - ${''}
      - ${''}
      - b
      - c`)

})

it('bump root leaf', () => {

  const steps = [
    newThought('a'),
    bumpThoughtDown({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ${''}
    - a`)

})

it('bump root thought with children', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    cursorBack,
    bumpThoughtDown({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ${''}
    - a
    - b`)

})
