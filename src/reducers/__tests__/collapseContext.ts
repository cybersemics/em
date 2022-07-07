import { HOME_TOKEN } from '../../constants'
import collapseContext from '../../reducers/collapseContext'
import cursorBack from '../../reducers/cursorBack'
import cursorUp from '../../reducers/cursorUp'
import newSubthought from '../../reducers/newSubthought'
import newThought from '../../reducers/newThought'
import exportContext from '../../selectors/exportContext'
import matchChildIdsWithThoughts from '../../test-helpers/matchPathWithThoughts'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('do nothing on leaf', () => {
  const steps = [newThought('a'), newSubthought('b'), collapseContext({})]

  // run steps through reducer flow and export as plaintext for readable test
  const state = initialState()
  const stateNew = reducerFlow(steps)(state)
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

it('collapse context with single child', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('c'), cursorBack, collapseContext({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - c`)

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
})

it('collapse context with multiple children', () => {
  const steps = [
    newThought('a'),
    newSubthought('k'),
    newThought('b'),
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
    - k
    - c
    - d`)

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
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
    - c
    - d
    - x`)

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
})

// @MIGRATION_TODO: Fix this after duplicate merge is fixed
it.skip('merge duplicate children', () => {
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
    - c
    - d`)

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
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

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
})

it('after collapse context set cursor to the parent if there are no visible children.', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('=x'), cursorBack, collapseContext({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'a' }])
})
