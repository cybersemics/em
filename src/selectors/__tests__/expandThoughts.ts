import _ from 'lodash'
import { NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { hashContext, initialState, reducerFlow } from '../../util'
import { expandThoughts, rankThoughtsFirstMatch } from '../../selectors'
import { newSubthought, newThought, setCursor, updateThoughts } from '../../reducers'
import { importText } from '../../action-creators'
import { State } from '../../util/initialState'
import { Context } from '../../types'

/** A reducer that sets the cursor to the given unranked path. Uses rankThoughtsFirstMatch. */
const setCursorFirstMatch = _.curryRight((state: State, pathUnranked: string[]) =>
  setCursor(state, {
    thoughtsRanked: rankThoughtsFirstMatch(state, pathUnranked),
  }))

/** Returns true if a context is expanded. */
const isContextExpanded = (state: State, context: Context) =>
  expandThoughts(state, state.cursor)[hashContext(context)]

describe('normal view', () => {

  it('ROOT is always expanded', () => {
    expect(isContextExpanded(initialState(), [ROOT_TOKEN])).toBeTruthy()
  })

  it('non-existent thoughts are not expanded', () => {
    expect(isContextExpanded(initialState(), ['c'])).toBeFalsy()
  })

  it('cursor children are expanded', () => {

    const steps = [
      newThought('a'),
      newSubthought('b'),
      setCursorFirstMatch(['a'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()

  })

  it('leaves are expanded', () => {

    const steps = [
      newThought('a'),
      newSubthought('b'),
      setCursorFirstMatch(['b'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()

  })

  it('grandchildren are not expanded', async () => {

    const text = `- a
  - b
  - c
    - d`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)

    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'c'])).toBeFalsy()

  })

  it('nieces are not expanded', async () => {

    const text = `- a
  - b
  - c
    - d`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)

    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a', 'b'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'c'])).toBeFalsy()

  })

  it('only-child descendants are expanded', async () => {

    const text = `- a
  - b
    - c
      - d
        - e1
        - e2
          - f`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)

    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e1'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e2'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e2', 'f'])).toBeFalsy()

  })
})

describe('table view', () => {

  it('column 1 is expanded when cursor is on table context', async () => {

    const text = `- a
  - =view
    - Table
  - b
    - c
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)

    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'd'])).toBeTruthy()

  })

  it('nieces are expanded when cursor is in column 1', async () => {

    const text = `- a
  - =view
    - Table
  - b
    - c
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const stateNew = updateThoughts(initialState(), thoughts)

    // cursor on row 1, column 2
    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    // cursor on row 2, column 2
    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()

  })

  it('cousins are expanded when cursor is in column 2', async () => {

    const text = `- a
  - =view
    - Table
  - b
    - c
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const stateNew = updateThoughts(initialState(), thoughts)

    // cursor on row 1, column 2
    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b', 'c'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    // cursor on row 2, column 2
    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd', 'e'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()

  })

  it('children of column 2 are not expanded when cursor is on table context', async () => {

    const text = `- a
  - =view
    - Table
  - b
    - c
      - x
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)

    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b', 'c'])).toBeFalsy()

  })

  it('children of column 2 are not expanded when cursor is in column 1', async () => {

    const text = `- a
  - =view
    - Table
  - b
    - c
      - x
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const stateNew = updateThoughts(initialState(), thoughts)

    // cursor on row 1, column 2
    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'b', 'c'])).toBeFalsy()

    // cursor on row 2, column 2
    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd'])
    expect(isContextExpanded(stateNew2, ['a', 'b', 'c'])).toBeFalsy()

  })

  it('children of column 2 are expanded when cursor is in column 2 in the same row', async () => {

    const text = `- a
  - =view
    - Table
  - b
    - c
      - x
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const stateNew = updateThoughts(initialState(), thoughts)

    // cursor on row 1, column 2 (same row)
    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b', 'c'])
    expect(isContextExpanded(stateNew1, ['a', 'b', 'c'])).toBeTruthy()

    // cursor on row 2, column 2 (different row)
    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd', 'e'])
    expect(isContextExpanded(stateNew2, ['a', 'b', 'c'])).toBeFalsy()

  })

})

describe('=pin', () => {

  it('pinned thoughts are expanded when cursor is on parent', async () => {

    const text = `- a
  - b
    - =pin
      - true
    - c
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)

    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()

    // unpinned sibling
    expect(isContextExpanded(stateNew, ['a', 'd'])).toBeFalsy()

  })

  it('pinned thoughts are expanded when cursor is on sibling', async () => {

    const text = `- a
  - b
    - =pin
      - true
    - c
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)

    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a', 'd'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()

  })
})

describe('=pinChildren', () => {

  it('pinned children are expanded when cursor is on parent', async () => {

    const text = `- a
  - =pinChildren
    - true
  - b
    - c
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)

    const steps = [
      updateThoughts(thoughts),
      setCursorFirstMatch(['a'])
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'd'])).toBeTruthy()

  })

  it('pinned children are expanded when cursor is on sibling', async () => {

    const text = `- a
  - =pinChildren
    - true
  - b
    - c
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const stateNew = updateThoughts(initialState(), thoughts)

    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()

  })

  it('pinned children are expanded when cursor is on niece', async () => {

    const text = `- a
  - =pinChildren
    - true
  - b
    - c
  - d
    - e`

    const thoughts = await importText(RANKED_ROOT, text)(NOOP, initialState)
    const stateNew = updateThoughts(initialState(), thoughts)

    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b', 'c'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd', 'e'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()

  })

})
