import { initialState, pathToContext, reducerFlow } from '../../util'
import { NOOP, RANKED_ROOT } from '../../constants'
import { importText } from '../../action-creators'
import { rankThoughtsFirstMatch } from '../../selectors'

// reducers
import {
  cursorDown,
  newSubthought,
  newThought,
  setCursor,
  toggleAttribute,
  toggleContextView,
  updateThoughts,
} from '../../reducers'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'

describe('normal view', () => {

  it('move cursor to next sibling', () => {

    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 1 }])

  })

  it('move cursor from parent first child', () => {

    const steps = [
      newThought('a'),
      newSubthought('b'),
      setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

  })

  it('move to first root child when there is no cursor', () => {

    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor({ thoughtsRanked: null }),
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
      newThought('a'),
      newThought('b'),
      setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
      newSubthought('a1'),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 1 }])

  })

  it('move cursor to nearest uncle', () => {

    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
      newSubthought('a1'),
      newSubthought('a1.1'),
      newSubthought('a1.1.1'),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 1 }])

  })

  it('work for sorted thoughts', () => {

    const steps = [
      newThought('a'),
      newSubthought('n'),
      newThought('m'),
      setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
      toggleAttribute({ context: ['a'], key: '=sort', value: 'Alphabetical' }),
      cursorDown
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a' }, { value: 'm' }])

  })

})

describe('context view', () => {

  it('move cursor from context view to first context', async () => {

    const text = `- a
  - m
    - x
- b
  - m
    - y`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      updateThoughts(thoughts),
      setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }] }),
      toggleContextView,
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'a', rank: 0 }])

  })

  it('move cursor from context view to next thought if there are no children', async () => {
    const text = `- a
    - m
    - n`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      cursorDown
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'n', rank: 1 }])
  })

  it(`move cursor to context's first child, if present`, async () => {

    const text = `- a
  - m
    - x
- b
  - m
    - y`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'a']),
      cursorDown
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'm', rank: 0 }, { value: 'a', rank: 0 }, { value: 'x', rank: 0 }])

  })

  it(`move cursor from a context to its sibling, if there aren't any children`, async () => {

    const text = `- a
  - m
- b
  - m`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      updateThoughts(thoughts),
      setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }] }),
      toggleContextView,
      setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'a', rank: 0 }] }),
      cursorDown
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'b', rank: 1 }])

  })

  it(`move cursor from context's last child to next uncle thought`, async () => {

    const text = `- a
  - m
    - x
- b
  - m
    - y`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a', 'm']),
      toggleContextView,
      setCursorFirstMatch(['a', 'm', 'a', 'x']),
      cursorDown
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'm', rank: 0 }, { value: 'b', rank: 1 }])

  })

  it(`move cursor from context's one child to its sibling`, async () => {

    const text = `- a
  - m
    - x
- b
  - m
    - y
    - z`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      updateThoughts(thoughts),
      state => setCursor(state, { thoughtsRanked: rankThoughtsFirstMatch(state, ['a', 'm']) }),
      toggleContextView,
      state => setCursor(state, { thoughtsRanked: rankThoughtsFirstMatch(state, ['a', 'm', 'b', 'y']) }),
      cursorDown
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(pathToContext(stateNew.cursor))
      .toMatchObject(['a', 'm', 'b', 'z'])

  })

  it(`move cursor from context's last descendant to next sibling if there aren't any further contexts`, async () => {

    const text = `- a
  - m
    - x
- b
  - m
    - y`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      updateThoughts(thoughts),
      state => setCursor(state, { thoughtsRanked: rankThoughtsFirstMatch(state, ['a', 'm']) }),
      toggleContextView,
      state => setCursor(state, { thoughtsRanked: rankThoughtsFirstMatch(state, ['a', 'm', 'b', 'y']) }),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(pathToContext(stateNew.cursor))
      .toMatchObject(['b'])

  })

})
