import _ from 'lodash'
import { HOME_TOKEN } from '../../constants'
import { hashContext, initialState, reducerFlow } from '../../util'
import { expandThoughts, rankThoughtsFirstMatch } from '../../selectors'
import { importText, newSubthought, newThought, setCursor } from '../../reducers'
import { Context, State } from '../../@types'

/** A reducer that sets the cursor to the given unranked path. Uses rankThoughtsFirstMatch. */
const setCursorFirstMatch = _.curryRight((state: State, pathUnranked: string[]) =>
  setCursor(state, {
    path: rankThoughtsFirstMatch(state, pathUnranked),
  }),
)

/** Returns true if a context is expanded. */
const isContextExpanded = (state: State, context: Context) => expandThoughts(state, state.cursor)[hashContext(context)]

describe('normal view', () => {
  it('ROOT is always expanded', () => {
    expect(isContextExpanded(initialState(), [HOME_TOKEN])).toBeTruthy()
  })

  it('non-existent thoughts are not expanded', () => {
    expect(isContextExpanded(initialState(), ['c'])).toBeFalsy()
  })

  it('cursor children are expanded', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
  })

  it('leaves are expanded', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursorFirstMatch(['a', 'b'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
  })

  it('grandchildren are not expanded', () => {
    const text = `
    - a
      - b
      - c
        - d`

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'c'])).toBeFalsy()
  })

  it('nieces are not expanded', () => {
    const text = `- a
  - b
  - c
    - d`

    const steps = [importText({ text }), setCursorFirstMatch(['a', 'b'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'c'])).toBeFalsy()
  })

  it('only-child descendants are expanded', () => {
    const text = `- a
  - b
    - c
      - d
        - e1
        - e2
          - f`

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e1'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e2'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e2', 'f'])).toBeFalsy()
  })
})

describe('table view', () => {
  it('column 1 is expanded when cursor is on table context', () => {
    const text = `- a
  - =view
    - Table
  - b
    - c
  - d
    - e`

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'd'])).toBeTruthy()
  })

  it('nieces are expanded when cursor is in column 1', () => {
    const text = `- a
  - =view
    - Table
  - b
    - c
  - d
    - e`

    const stateNew = importText(initialState(), { text })

    // cursor on row 1, column 2
    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    // cursor on row 2, column 2
    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()
  })

  it('cousins are expanded when cursor is in column 2', () => {
    const text = `- a
  - =view
    - Table
  - b
    - c
  - d
    - e`

    const stateNew = importText(initialState(), { text })

    // cursor on row 1, column 2
    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b', 'c'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    // cursor on row 2, column 2
    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd', 'e'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()
  })

  it('children of column 2 are not expanded when cursor is on table context', () => {
    const text = `- a
  - =view
    - Table
  - b
    - c
      - x
  - d
    - e`

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b', 'c'])).toBeFalsy()
  })

  it('children of column 2 are not expanded when cursor is in column 1', () => {
    const text = `- a
  - =view
    - Table
  - b
    - c
      - x
  - d
    - e`

    const stateNew = importText(initialState(), { text })

    // cursor on row 1, column 2
    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'b', 'c'])).toBeFalsy()

    // cursor on row 2, column 2
    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd'])
    expect(isContextExpanded(stateNew2, ['a', 'b', 'c'])).toBeFalsy()
  })

  it('children of column 2 are expanded when cursor is in column 2 in the same row', () => {
    const text = `- a
  - =view
    - Table
  - b
    - c
      - x
  - d
    - e`

    const stateNew = importText(initialState(), { text })

    // cursor on row 1, column 2 (same row)
    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b', 'c'])
    expect(isContextExpanded(stateNew1, ['a', 'b', 'c'])).toBeTruthy()

    // cursor on row 2, column 2 (different row)
    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd', 'e'])
    expect(isContextExpanded(stateNew2, ['a', 'b', 'c'])).toBeFalsy()
  })
})

describe('=pin', () => {
  it('pinned thoughts are expanded when cursor is on parent', () => {
    const text = `- a
  - b
    - =pin
      - true
    - c
  - d
    - e`

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()

    // unpinned sibling
    expect(isContextExpanded(stateNew, ['a', 'd'])).toBeFalsy()
  })

  it('pinned thoughts are expanded when cursor is on sibling', () => {
    const text = `- a
  - b
    - =pin
      - true
    - c
  - d
    - e`

    const steps = [importText({ text }), setCursorFirstMatch(['a', 'd'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
  })

  it('only-child descendants are not expanded with =pin/false', () => {
    const text = `
      - a
        - b
          - =pin
            - false
          - c
    `

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c'])).toBeFalsy()
  })
  it('thoughts with =pin/false is not expanded even if ancestor has =pinChildren/true', () => {
    const text = `
    - a
      - =pinChildren
        - true
      - b
        - =pin
          - false
        - c
      - d
    `

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['a', 'd'])).toBeTruthy()
  })
})

describe('=pinChildren', () => {
  it('pinned children are expanded when cursor is on parent', () => {
    const text = `- a
  - =pinChildren
    - true
  - b
    - c
  - d
    - e`

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'd'])).toBeTruthy()
  })

  it('pinned children are expanded when cursor is on sibling', () => {
    const text = `- a
  - =pinChildren
    - true
  - b
    - c
  - d
    - e`

    const stateNew = importText(initialState(), { text })

    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()
  })

  it('pinned children are expanded when cursor is on niece', () => {
    const text = `- a
  - =pinChildren
    - true
  - b
    - c
  - d
    - e`

    const stateNew = importText(initialState(), { text })

    const stateNew1 = setCursorFirstMatch(stateNew, ['a', 'b', 'c'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    const stateNew2 = setCursorFirstMatch(stateNew, ['a', 'd', 'e'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()
  })
})

describe('expand with : char', () => {
  it('thoughts end with ":" are expanded', () => {
    const text = `
    - a
      - x
      - y
    - b:
      - c
      - d
    - x
      - 1
      - 2`

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'x'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['x'])).toBeFalsy()
  })

  it('subthoughts end with ":" are expanded', () => {
    const text = `
    - a
      - x
    - b:
      - c:
        - x
          - a
        - y
      - d`

    const steps = [importText({ text }), setCursorFirstMatch(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b', 'c'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b', 'c', 'x'])).toBeFalsy()
  })

  it('thougts that contain html and end with ":" are expanded', () => {
    const steps = [
      newThought('a'),
      newSubthought('x'),
      setCursorFirstMatch(['a']),
      newThought('<b>b:</b>'),
      newSubthought('<b><i>c:</i></b>'),
      newSubthought('d'),
      setCursorFirstMatch(['a']),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b', 'c'])).toBeTruthy()
  })
})

// Related issue: https://github.com/cybersemics/em/issues/1238
it('thought with html value should be expanded', () => {
  const text = `
  - <i>a</i>
    - b
  - c`

  const stateNew = importText(initialState(), { text })

  const stateNew1 = setCursorFirstMatch(stateNew, ['<i>a</i>'])

  expect(isContextExpanded(stateNew1, ['<i>a</i>'])).toBeTruthy()
})
