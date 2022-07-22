import { HOME_TOKEN } from '../../constants'
import archiveThought from '../../reducers/archiveThought'
import cursorUp from '../../reducers/cursorUp'
import newSubthought from '../../reducers/newSubthought'
import newThought from '../../reducers/newThought'
import setCursor from '../../reducers/setCursor'
import toggleContextView from '../../reducers/toggleContextView'
import exportContext from '../../selectors/exportContext'
import getContexts from '../../selectors/getContexts'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
// TODO: Why does util have to be imported before selectors and reducers?
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('archive a thought', () => {
  const steps = [newThought('a'), newThought('b'), archiveThought({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - b
  - a`)
})

// @MIGRATION_TODO: Enable this after moveThought duplicate merge has been fixed. Should a context have duplicate thought ??
it.skip('deduplicate archived thoughts with the same value', () => {
  const steps = [newThought('a'), newThought('b'), newThought('b'), archiveThought({}), archiveThought({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - b
  - a`)
})

it('do nothing if there is no cursor', () => {
  const steps = [newThought('a'), setCursor({ path: null }), archiveThought({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('move to top of archive', () => {
  const steps = [newThought('a'), newThought('b'), newThought('c'), archiveThought({}), archiveThought({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - b
    - c
  - a`)
})

it('permanently delete empty thought', () => {
  const steps = [newThought('a'), newThought(''), archiveThought({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('permanently delete thought from archive', () => {
  const steps = [
    newThought('a'),
    newThought('b'),
    archiveThought({}),
    setCursorFirstMatch(['=archive', 'b']),
    archiveThought({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
  - a`)
})

it('permanently delete archive', () => {
  const steps = [
    newThought('a'),
    newThought('b'),
    archiveThought({}),
    setCursorFirstMatch(['=archive']),
    archiveThought({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)

  // ensure =archive is removed from lexemeIndex
  expect(getContexts(stateNew, '=archive')).toHaveLength(0)
})

it('permanently delete archive with descendants', () => {
  const steps = [
    newThought('a'),
    newSubthought('b'),
    setCursorFirstMatch(['a']),
    archiveThought({}),
    setCursorFirstMatch(['=archive']),
    archiveThought({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}`)

  // ensure =archive is removed from lexemeIndex
  expect(getContexts(stateNew, '=archive')).toHaveLength(0)

  // ensure descendants are remvoed from lexemeIndex
  expect(getContexts(stateNew, 'a')).toHaveLength(0)
})

it('cursor should move to prev sibling', () => {
  const steps = [newThought('a'), newSubthought('a1'), newThought('a2'), newThought('a3'), cursorUp, archiveThought({})]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())
  expectPathToEqual(stateNew, stateNew.cursor!, [
    { value: 'a', rank: 0 },
    { value: 'a1', rank: 0 },
  ])
})

it('cursor should move to next sibling if there is no prev sibling', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    newThought('a3'),
    cursorUp,
    cursorUp,
    archiveThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expectPathToEqual(stateNew, stateNew.cursor!, [
    { value: 'a', rank: 0 },
    { value: 'a2', rank: 1 },
  ])
})

it('cursor should move to parent if the deleted thought has no siblings', () => {
  const steps = [newThought('a'), newSubthought('a1'), archiveThought({})]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expectPathToEqual(stateNew, stateNew.cursor!, [{ value: 'a', rank: 0 }])
})

it('cursor should be removed if the last thought is deleted', () => {
  const steps = [newThought('a'), archiveThought({})]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)
})

it('empty thought should be archived if it has descendants', () => {
  const steps = [newThought('a'), newThought(''), newSubthought('b'), setCursorFirstMatch(['']), archiveThought({})]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - ${'' /* prevent trim_trailing_whitespace */}
      - b
  - a`)
})

// @MIGRATION: Context view doesn't work due to migration.
describe.skip('context view', () => {
  it('archive thought from context view', () => {
    const steps = [
      newThought({ value: 'a' }),
      newThought({ value: 'm', insertNewSubthought: true }),
      newThought({ value: 'x', insertNewSubthought: true }),
      cursorUp,
      cursorUp,
      newThought({ value: 'b' }),
      newThought({ value: 'm', insertNewSubthought: true }),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'b']),
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    const expected = `- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - =archive
      - m`
    expect(exported).toBe(expected)
  })

  it('archive thought with descendants from context view', () => {
    const steps = [
      newThought({ value: 'a' }),
      newThought({ value: 'm', insertNewSubthought: true }),
      newThought({ value: 'x', insertNewSubthought: true }),
      setCursorFirstMatch(['a']),
      newThought({ value: 'b' }),
      newThought({ value: 'm', insertNewSubthought: true }),
      toggleContextView,
      setCursorFirstMatch(['b', 'm', 'a']),
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    const expected = `- ${HOME_TOKEN}
  - a
    - =archive
      - m
        - x
  - b
    - m`
    expect(exported).toBe(expected)
  })

  it('cursor should move to prev sibling', () => {
    // same steps as "archive thought from context view"
    const steps = [
      newThought({ value: 'a' }),
      newThought({ value: 'm', insertNewSubthought: true }),
      newThought({ value: 'x', insertNewSubthought: true }),
      cursorUp,
      cursorUp,
      newThought({ value: 'b' }),
      newThought({ value: 'm', insertNewSubthought: true }),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'b']),
      archiveThought({}),
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject([
      { value: 'a', rank: 0 },
      { value: 'm', rank: 0 },
      { value: 'a', rank: 0 },
    ])
  })

  it('cursor should move to next sibling if there is no prev sibling', () => {
    // same steps as "archive thought with descendants from context view"
    const steps = [
      newThought({ value: 'a' }),
      newThought({ value: 'm', insertNewSubthought: true }),
      newThought({ value: 'x', insertNewSubthought: true }),
      setCursorFirstMatch(['a']),
      newThought({ value: 'b' }),
      newThought({ value: 'm', insertNewSubthought: true }),
      toggleContextView,
      setCursorFirstMatch(['b', 'm', 'a']),
      archiveThought({}),
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject([
      { value: 'b', rank: 1 },
      { value: 'm', rank: 0 },
      { value: 'b', rank: 1 },
    ])
  })
})
