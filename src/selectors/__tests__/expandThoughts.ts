import Context from '../../@types/Context'
import State from '../../@types/State'
import importText from '../../actions/importText'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import expandThoughts from '../../selectors/expandThoughts'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import initialState from '../../util/initialState'
import pathToContext from '../../util/pathToContext'
import reducerFlow from '../../util/reducerFlow'

/** Returns true if a context is expanded. */
const isContextExpanded = (state: State, context: Context) => {
  const path = contextToPath(state, context)
  if (!path) return false
  return !!expandThoughts(state, state.cursor)[hashPath(path)]
}

/** Returns a list of expanded contexts. */
const expandAtCursor = (state: State) => {
  const expandedPathMap = expandThoughts(state, state.cursor)
  return Object.values(expandedPathMap).map(path => pathToContext(state, path))
}

describe('normal view', () => {
  it('ROOT is always expanded', () => {
    expect(isContextExpanded(initialState(), [HOME_TOKEN])).toBeTruthy()
  })

  it('non-existent thoughts are not expanded', () => {
    expect(isContextExpanded(initialState(), ['c'])).toBeFalsy()
  })

  it('cursor children are expanded', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursor(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
  })

  it('leaves are expanded', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursor(['a', 'b'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
  })

  it('grandchildren are not expanded', () => {
    const text = `
      - a
        - b
        - c
          - d
    `

    const steps = [importText({ text }), setCursor(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'c'])).toBeFalsy()
  })

  it('nieces are not expanded', () => {
    const text = `
      - a
        - b
        - c
          - d
    `

    const steps = [importText({ text }), setCursor(['a', 'b'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'c'])).toBeFalsy()
  })

  it('only child descendants are expanded', () => {
    const text = `
      - a
        - b
          - c
            - d
              - e1
              - e2
                - f
    `

    const steps = [importText({ text }), setCursor(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e1'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e2'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e2', 'f'])).toBeFalsy()
  })

  it('only child of =children/=pin subthought is not expanded', () => {
    const text = `
      - To Do
        - =children
          - =pin
            - true
        - ::
          - two
          - three
        - ✓
          - one
            - 1.1
            - 1.2
            - 1.3
    `

    const steps = [importText({ text }), setCursor(['To Do'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(expandAtCursor(stateNew)).toIncludeSameMembers([[HOME_TOKEN], ['To Do'], ['To Do', '::'], ['To Do', '✓']])
  })

  // Related issue: https://github.com/cybersemics/em/issues/1238
  it('thought with html value should be expanded', () => {
    const text = `
      - <i>a</i>
        - b
      - c
    `

    const stateNew = importText(initialState(), { text })

    const stateNew1 = setCursor(stateNew, ['<i>a</i>'])

    expect(isContextExpanded(stateNew1, ['<i>a</i>'])).toBeTruthy()
  })

  it('cursor ancestors are expanded', () => {
    const text = `
      - a
        - b
          - c
            - d
              - e
                - f
    `

    const steps = [importText({ text }), setCursor(['a', 'b', 'c', 'd', 'e', 'f'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b', 'c', 'd', 'e', 'f'])).toBeTruthy()
  })

  it('pinned uncles should stay expanded', () => {
    const text = `
      - a
        - =pin
          - true
        - b
      - c
        - d
          - e
            - f
    `

    const steps = [importText({ text }), setCursor(['c', 'd', 'e', 'f'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, [HOME_TOKEN])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeFalsy()
    expect(isContextExpanded(stateNew, ['c'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['c', 'd'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['c', 'd', 'e'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['c', 'd', 'e', 'f'])).toBeTruthy()
  })
})

describe('table view', () => {
  it('column 1 is expanded when cursor is on table context', () => {
    const text = `
      - a
        - =view
          - Table
        - b
          - c
        - d
          - e
    `

    const steps = [importText({ text }), setCursor(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'd'])).toBeTruthy()
  })

  it('nieces are expanded when cursor is in column 1', () => {
    const text = `
      - a
        - =view
          - Table
        - b
          - c
        - d
          - e
    `

    const stateNew = importText(initialState(), { text })

    // cursor on row 1, column 2
    const stateNew1 = setCursor(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    // cursor on row 2, column 2
    const stateNew2 = setCursor(stateNew, ['a', 'd'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()
  })

  it('cousins are expanded when cursor is in column 2', () => {
    const text = `
      - a
        - =view
          - Table
        - b
          - c
        - d
          - e
    `

    const stateNew = importText(initialState(), { text })

    // cursor on row 1, column 2
    const stateNew1 = setCursor(stateNew, ['a', 'b', 'c'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    // cursor on row 2, column 2
    const stateNew2 = setCursor(stateNew, ['a', 'd', 'e'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()
  })

  it('children of column 2 are not expanded when cursor is on table context', () => {
    const text = `
      - a
        - =view
          - Table
        - b
          - c
            - x
        - d
          - e
    `

    const steps = [importText({ text }), setCursor(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b', 'c'])).toBeFalsy()
  })

  it('children of column 2 are not expanded when cursor is in column 1', () => {
    const text = `
      - a
        - =view
          - Table
        - b
          - c
            - x
        - d
          - e
    `

    const stateNew = importText(initialState(), { text })

    // cursor on row 1, column 2
    const stateNew1 = setCursor(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'b', 'c'])).toBeFalsy()

    // cursor on row 2, column 2
    const stateNew2 = setCursor(stateNew, ['a', 'd'])
    expect(isContextExpanded(stateNew2, ['a', 'b', 'c'])).toBeFalsy()
  })

  it('children of column 2 are expanded when cursor is in column 2 in the same row', () => {
    const text = `
      - a
        - =view
          - Table
        - b
          - c
            - x
        - d
          - e
    `

    const stateNew = importText(initialState(), { text })

    // cursor on row 1, column 2 (same row)
    const stateNew1 = setCursor(stateNew, ['a', 'b', 'c'])
    expect(isContextExpanded(stateNew1, ['a', 'b', 'c'])).toBeTruthy()

    // cursor on row 2, column 2 (different row)
    const stateNew2 = setCursor(stateNew, ['a', 'd', 'e'])
    expect(isContextExpanded(stateNew2, ['a', 'b', 'c'])).toBeFalsy()
  })
})

describe('pin', () => {
  describe('=pin/true', () => {
    it('pinned thoughts are expanded when cursor is on parent', () => {
      const text = `
        - a
          - b
            - =pin
              - true
            - c
          - d
            - e
      `

      const steps = [importText({ text }), setCursor(['a'])]

      const stateNew = reducerFlow(steps)(initialState())

      expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()

      // unpinned sibling
      expect(isContextExpanded(stateNew, ['a', 'd'])).toBeFalsy()
    })

    it('pinned thoughts are expanded when cursor is on sibling', () => {
      const text = `
        - a
          - b
            - =pin
              - true
            - c
          - d
            - e
      `

      const steps = [importText({ text }), setCursor(['a', 'd'])]

      const stateNew = reducerFlow(steps)(initialState())

      expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    })
  })

  describe('=pin/false', () => {
    it('only child descendants are not expanded with =pin/false', () => {
      const text = `
        - a
          - b
            - =pin
              - false
            - c
      `

      const steps = [importText({ text }), setCursor(['a'])]

      const stateNew = reducerFlow(steps)(initialState())

      expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
      expect(isContextExpanded(stateNew, ['a', 'b'])).toBeFalsy()
      expect(isContextExpanded(stateNew, ['a', 'b', 'c'])).toBeFalsy()
    })

    it('child with =pin/false is not expanded by =children/=pin/true', () => {
      const text = `
      - a
        - =children
          - =pin
            - true
        - b
          - =pin
            - false
          - c
        - d
      `

      const steps = [importText({ text }), setCursor(['a'])]

      const stateNew = reducerFlow(steps)(initialState())

      expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
      expect(isContextExpanded(stateNew, ['a', 'b'])).toBeFalsy()
      expect(isContextExpanded(stateNew, ['a', 'd'])).toBeTruthy()
    })

    it('child with =pin/false is expanded by cursor despite =children/=pin/true on parent', () => {
      const text = `
        - a
          - =children
            - =pin
              - true
          - b
            - =pin
              - false
            - c
      `

      const steps = [importText({ text }), setCursor(['a', 'b'])]

      const stateNew = reducerFlow(steps)(initialState())

      expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
      expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    })

    it('descendant of cursor with =pin/false is expanded despite =children/=pin/true on parent', () => {
      const text = `
        - a
          - =children
            - =pin
              - true
          - b
            - =pin
              - false
            - c
      `

      const steps = [importText({ text }), setCursor(['a', 'b', 'c'])]

      const stateNew = reducerFlow(steps)(initialState())

      expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
      expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    })

    it('children of cursor should always be visible, it should take precedence over =pin/false', () => {
      const text = `
        - a
          - =pin
            - false
          - b
            - c
      `

      const steps = [importText({ text }), setCursor(['a', 'b'])]

      const stateNew = reducerFlow(steps)(initialState())

      expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    })

    it('siblings of thoughts with =pin/false should not be expanded', () => {
      const text = `
        - a
          - b
            - =pin
              - false
            - c
          - d
            - e
      `

      const steps = [importText({ text }), setCursor(['a'])]

      const stateNew = reducerFlow(steps)(initialState())

      expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
      expect(isContextExpanded(stateNew, ['a', 'b'])).toBeFalsy()
      expect(isContextExpanded(stateNew, ['a', 'd'])).toBeFalsy()
    })
  })
})

describe('=children/=pin', () => {
  it('pinned children are expanded when cursor is on parent', () => {
    const text = `
      - a
        - =children
          - =pin
            - true
        - b
          - c
        - d
          - e
    `

    const steps = [importText({ text }), setCursor(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['a', 'd'])).toBeTruthy()
  })

  it('pinned children are expanded when cursor is on sibling', () => {
    const text = `
      - a
        - =children
          - =pin
            - true
        - b
          - c
        - d
          - e
    `

    const stateNew = importText(initialState(), { text })

    const stateNew1 = setCursor(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    const stateNew2 = setCursor(stateNew, ['a', 'd'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()
  })

  it('pinned children are expanded when cursor is on niece', () => {
    const text = `
      - a
        - =children
          - =pin
            - true
        - b
          - c
        - d
          - e
    `

    const stateNew = importText(initialState(), { text })

    const stateNew1 = setCursor(stateNew, ['a', 'b', 'c'])
    expect(isContextExpanded(stateNew1, ['a', 'd'])).toBeTruthy()

    const stateNew2 = setCursor(stateNew, ['a', 'd', 'e'])
    expect(isContextExpanded(stateNew2, ['a', 'b'])).toBeTruthy()
  })

  it('=children/=pin/false overrides expand only child', () => {
    const text = `
      - a
        - =children
          - =pin
            - false
        - b
          - c
    `

    const stateNew = importText(initialState(), { text })

    // not expanded when only child
    expect(isContextExpanded(stateNew, ['a', 'b'])).toBeFalsy()

    // expanded with cursor
    const stateNew1 = setCursor(stateNew, ['a', 'b'])
    expect(isContextExpanded(stateNew1, ['a', 'b'])).toBeTruthy()
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
        - 2
    `

    const steps = [importText({ text }), setCursor(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b:'])).toBeTruthy()
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
        - d
    `

    const steps = [importText({ text }), setCursor(['a'])]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b:'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b:', 'c:'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['b', 'c:', 'x'])).toBeFalsy()
  })

  it('thougts that contain html and end with ":" are expanded', () => {
    const steps = [
      newThought('a'),
      newSubthought('x'),
      setCursor(['a']),
      newThought('<b>b:</b>'),
      newSubthought('<b><i>c:</i></b>'),
      newSubthought('d'),
      setCursor(['a']),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextExpanded(stateNew, ['a'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['<b>b:</b>'])).toBeTruthy()
    expect(isContextExpanded(stateNew, ['<b>b:</b>', '<b><i>c:</i></b>'])).toBeTruthy()
  })
})
