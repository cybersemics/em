import initialState from '../../util/initialState'
import pathToContext from '../../util/pathToContext'
import reducerFlow from '../../util/reducerFlow'
import contextToPath from '../../selectors/contextToPath'
import State from '../../@types/State'

// reducers
import cursorDown from '../../reducers/cursorDown'
import importText from '../../reducers/importText'
import newSubthought from '../../reducers/newSubthought'
import newThought from '../../reducers/newThought'
import setCursor from '../../reducers/setCursor'
import toggleAttribute from '../../reducers/toggleAttribute'
import toggleContextView from '../../reducers/toggleContextView'

import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import matchChildIdsWithThoughts from '../../test-helpers/matchPathWithThoughts'

describe('normal view', () => {
  it('move cursor to next sibling', () => {
    const steps = [newThought('a'), newThought('b'), setCursorFirstMatch(['a']), cursorDown]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'b', rank: 1 }])
  })

  it('move cursor from parent first child', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursorFirstMatch(['a']), cursorDown]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())
    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [
      { value: 'a', rank: 0 },
      { value: 'b', rank: 0 },
    ])
  })

  it('move to first root child when there is no cursor', () => {
    const steps = [newThought('a'), newThought('b'), setCursor({ path: null }), cursorDown]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())
    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'a', rank: 0 }])
  })

  it('do nothing when there are no thoughts', () => {
    const stateNew = cursorDown(initialState())

    expect(stateNew.cursor).toBe(null)
  })

  it('move cursor to next uncle', () => {
    const steps = [newThought('a'), newThought('b'), setCursorFirstMatch(['a']), newSubthought('a1'), cursorDown]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'b', rank: 1 }])
  })

  it('move cursor to nearest uncle', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursorFirstMatch(['a']),
      newSubthought('a1'),
      newSubthought('a1.1'),
      newSubthought('a1.1.1'),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())
    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'b', rank: 1 }])
  })

  it('work for sorted thoughts', () => {
    const steps = [
      newThought('a'),
      newSubthought('n'),
      newThought('m'),
      setCursorFirstMatch(['a']),
      (state: State) =>
        toggleAttribute(state, { path: contextToPath(state, ['a']), key: '=sort', value: 'Alphabetical' }),
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [{ value: 'a' }, { value: 'm' }])
  })
})

// @MIGRATION_TODO: context view is not working yet.
describe.skip('context view', () => {
  it('move cursor from context view to first context', () => {
    const text = `- a
  - m
    - x
- b
  - m
    - y`

    const steps = [
      importText({ text }),
      (newState: State) =>
        setCursor(newState, {
          path: contextToPath(newState, ['a', 'm']),
        }),
      toggleContextView,
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [
      { value: 'a', rank: 0 },
      { value: 'm', rank: 1 },
      { value: 'a', rank: 0 },
    ])
  })

  it('move cursor from context view to next thought if there are no children', () => {
    const text = `- a
    - m
    - n`

    const steps = [importText({ text }), setCursorFirstMatch(['a', 'm']), toggleContextView, cursorDown]

    const stateNew = reducerFlow(steps)(initialState())

    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [
      { value: 'a', rank: 0 },
      { value: 'n', rank: 1 },
    ])
  })

  it("move cursor to context's first child, if present", () => {
    const text = `- a
  - m
    - x
- b
  - m
    - y`

    const steps = [
      importText({ text }),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'a']),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject([
      { value: 'a', rank: 0 },
      { value: 'm', rank: 0 },
      { value: 'a', rank: 0 },
      { value: 'x', rank: 0 },
    ])
  })

  it("move cursor from a context to its sibling, if there aren't any children", () => {
    const text = `- a
  - m
- b
  - m`

    const steps = [
      importText({ text }),
      (newState: State) =>
        setCursor(newState, {
          path: contextToPath(newState, ['a', 'm']),
        }),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'a']),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [
      { value: 'a', rank: 0 },
      { value: 'm', rank: 1 },
      { value: 'b', rank: 1 },
    ])
  })

  it("move cursor from context's last child to next uncle thought", () => {
    const text = `- a
  - m
    - x
- b
  - m
    - y`

    const steps = [
      importText({ text }),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'a', 'x']),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [
      { value: 'a', rank: 0 },
      { value: 'm', rank: 0 },
      { value: 'b', rank: 1 },
    ])
  })

  it("move cursor from context's one child to its sibling", () => {
    const text = `- a
  - m
    - x
- b
  - m
    - y
    - z`

    const steps = [
      importText({ text }),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'b', 'y']),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toBeDefined()
    expect(pathToContext(stateNew, stateNew.cursor!)).toMatchObject(['a', 'm', 'b', 'z'])
  })

  it("move cursor from context's last descendant to next sibling if there aren't any further contexts", () => {
    const text = `- a
  - m
    - x
- b
  - m
    - y`

    const steps = [
      importText({ text }),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'b', 'y']),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toBeDefined()
    expect(pathToContext(stateNew, stateNew.cursor!)).toMatchObject(['b'])
  })

  it('move cursor to circular path', () => {
    const text = `
    - a
      - m
        - x
        - y
    - b
      - m
        - y
        - z
    `

    const steps = [
      importText({ text }),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'a', 'x']),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toBeDefined()
    expect(pathToContext(stateNew, stateNew.cursor!)).toMatchObject(['a', 'm', 'a', 'y'])
  })

  it('should not move cursor if the cursor on last thought', () => {
    const steps = [newThought('a'), newThought('b'), setCursorFirstMatch(['a']), cursorDown]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject([{ value: 'b', rank: 1 }])
  })
})
