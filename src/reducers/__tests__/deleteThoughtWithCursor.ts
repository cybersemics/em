import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext, rankThoughtsFirstMatch } from '../../selectors'

// reducers
import cursorBack from '../cursorBack'
import cursorUp from '../cursorUp'
import deleteThoughtWithCursor from '../deleteThoughtWithCursor'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setCursor from '../setCursor'

it('delete thought within root', () => {
  const steps = [newThought('a'), newThought('b'), deleteThoughtWithCursor({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('delete thought with no cursor should do nothing ', () => {
  const steps = [newThought('a'), newThought('b'), setCursor({ path: null }), deleteThoughtWithCursor({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
})

it('delete thought within context', () => {
  const steps = [newThought('a'), newSubthought('a1'), deleteThoughtWithCursor({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('delete descendants', () => {
  const steps = [newThought('a'), newSubthought('a1'), newSubthought('a1.1'), cursorBack, deleteThoughtWithCursor({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('cursor should move to prev sibling', () => {
  const steps = [newThought('a'), newSubthought('a1'), newThought('a2'), newThought('a3'), deleteThoughtWithCursor({})]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(rankThoughtsFirstMatch(stateNew, ['a', 'a2'])!)
})

it('cursor should move to next sibling if there is no prev sibling', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    newThought('a3'),
    cursorUp,
    cursorUp,
    deleteThoughtWithCursor({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(rankThoughtsFirstMatch(stateNew, ['a', 'a2'])!)
})

it('cursor should move to parent if the deleted thought has no siblings', () => {
  const steps = [newThought('a'), newSubthought('a1'), deleteThoughtWithCursor({})]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(rankThoughtsFirstMatch(stateNew, ['a'])!)
})

it('cursor should be removed if the last thought is deleted', () => {
  const steps = [newThought('a'), deleteThoughtWithCursor({})]
  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)
})
