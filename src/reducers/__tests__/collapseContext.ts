import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { collapseContext, cursorBack, cursorUp, newSubthought, newThought } from '../../reducers'
import { exportContext } from '../../selectors'

it('do nothing on leaf', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    collapseContext({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const state = initialState()
  const stateNew = reducerFlow(steps)(state)
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)

})

it('collapse context with single child', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newSubthought('c'),
    cursorBack,
    collapseContext({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =archive
      - b
    - c`)

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'c', rank: 0 }])

})

it('collapse context with multiple children', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newSubthought('c'),
    newThought('d'),
    cursorBack,
    collapseContext({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =archive
      - b
    - c
    - d`)

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'c', rank: 0 }])

})

it('merge children', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newThought('x'),
    cursorUp,
    newSubthought('c'),
    newThought('d'),
    cursorBack,
    collapseContext({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =archive
      - b
    - c
    - x
    - d`)

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'c', rank: 0 }])

})

it('merge duplicate children', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newThought('d'),
    cursorUp,
    newSubthought('c'),
    newThought('d'),
    cursorBack,
    collapseContext({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =archive
      - b
    - c
    - d`)

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'c', rank: 0 }])

})

it('after collapse context set cursor to the first visible children.', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newSubthought('=x'),
    newThought('c'),
    cursorBack,
    collapseContext({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject([{ value: 'a' }, { value: 'c' }])
})

it('after collapse context set cursor to the parent if there are no visible children.', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newSubthought('=x'),
    cursorBack,
    collapseContext({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject([{ value: 'a' }])
})
