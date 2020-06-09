import { initialState, reducerFlow } from '../../util'
import { NOOP, RANKED_ROOT } from '../../constants'
import { importText } from '../../action-creators'

// reducers
import {
  cursorDown,
  newThought,
  setCursor,
  toggleContextView,
  updateThoughts,
} from '../../reducers'

describe('normal view', () => {

  it('move cursor to next sibling', () => {

    const steps = [
      state => newThought(state, { value: 'a' }),
      state => newThought(state, { value: 'b' }),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 1 }])

  })

  it('move cursor from parent first child', () => {

    const steps = [
      state => newThought(state, { value: 'a' }),
      state => newThought(state, { value: 'b', insertNewSubthought: true }),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

  })

  it('move to first root child when there is no cursor', () => {

    const steps = [
      state => newThought(state, { value: 'a' }),
      state => newThought(state, { value: 'b' }),
      state => setCursor(state, { thoughtsRanked: null }),
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
      state => newThought(state, { value: 'a' }),
      state => newThought(state, { value: 'b' }),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
      state => newThought(state, { value: 'a1', insertNewSubthought: true }),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 1 }])

  })

  it('move cursor to nearest uncle', () => {

    const steps = [
      state => newThought(state, { value: 'a' }),
      state => newThought(state, { value: 'b' }),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
      state => newThought(state, { value: 'a1', insertNewSubthought: true }),
      state => newThought(state, { value: 'a1.1', insertNewSubthought: true }),
      state => newThought(state, { value: 'a1.1.1', insertNewSubthought: true }),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 1 }])

  })

})

describe('context view', () => {

  // eslint-disable-next-line fp/no-let
  let text = ''
  beforeEach(() => {
    text = `- a
    - m
      - x
  - b
    - m
      - y`
  })

  it('move cursor from context view to first context', async () => {

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      state => updateThoughts(state, thoughts),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }] }),
      toggleContextView,
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'a', rank: 0 }])

  })

  it(`moves cursor to context's first child, if present`, async () => {

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      state => updateThoughts(state, thoughts),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }] }),
      toggleContextView,
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'a', rank: 0 }] }),
      cursorDown
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'a', rank: 0 }, { value: 'x', rank: 2 }])

  })

  it(`moves cursor from a context to its sibling, if there aren't any children`, async () => {

    const text = `- a
   - m
 - b
   - m`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      state => updateThoughts(state, thoughts),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }] }),
      toggleContextView,
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'a', rank: 0 }] }),
      cursorDown
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'b', rank: 1 }])

  })

  it(`moves cursor from context's last child to next uncle thought`, async () => {

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      state => updateThoughts(state, thoughts),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }] }),
      toggleContextView,
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'a', rank: 0 }, { value: 'x', rank: 2 }] }),
      cursorDown
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'b', rank: 1 }])

  })

  it(`moves cursor from context's one child to its sibling`, async () => {

    const text = `- a
    - m
      - x
  - b
    - m
      - y
      - z`
    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      state => updateThoughts(state, thoughts),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 4 }] }),
      toggleContextView,
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'b', rank: 4 }, { value: 'y', rank: 6 }] }),
      cursorDown
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }, { value: 'b', rank: 1 }, { value: 'z', rank: 7 }])

  })

  it.skip(`moves cursor from context's last child to next though if there aren't any further contexts`, async () => {

    const text = `- a
    - m
      - x
  - b
    - m
      - y`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const steps = [
      state => updateThoughts(state, thoughts),
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 0 }] }),
      toggleContextView,
      state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 0 }, { value: 'b', rank: 1 }, { value: 'y', rank: 6 }] }),
      cursorDown,
    ]

    // run steps through reducer flow
    const stateNew = reducerFlow(steps)(initialState())
    console.log(stateNew.cursor)

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 0 }])

  })

})
