import { HOME_TOKEN } from '../../constants'
import collapseContext from '../../reducers/collapseContext'
import cursorBack from '../../reducers/cursorBack'
import cursorDown from '../../reducers/cursorDown'
import cursorUp from '../../reducers/cursorUp'
import importText from '../../reducers/importText'
import newSubthought from '../../reducers/newSubthought'
import newThought from '../../reducers/newThought'
import exportContext from '../../selectors/exportContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
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

  expectPathToEqual(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
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

  expectPathToEqual(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
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

  expectPathToEqual(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
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
    - c
    - d`)

  expectPathToEqual(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
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

  expectPathToEqual(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'c' }])
})

it('after collapse context set cursor to the parent if there are no visible children.', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('=x'), cursorBack, collapseContext({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  expectPathToEqual(stateNew, stateNew.cursor!, [{ value: 'a' }])
})

it('collapse empty thought with empty child', () => {
  const steps = [
    importText({
      text: `
      - a
        - ${''}
          - ${''}
            - b
    `,
    }),
    cursorDown,
    collapseContext({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${''}
      - b`)

  expectPathToEqual(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: '' }])
})
