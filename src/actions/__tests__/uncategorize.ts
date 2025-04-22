import cursorBack from '../../actions/cursorBack'
import cursorUp from '../../actions/cursorUp'
import importText from '../../actions/importText'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import toggleContextView from '../../actions/toggleContextView'
import uncategorize from '../../actions/uncategorize'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import contextToThought from '../../test-helpers/contextToThought'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('normal view', () => {
  it('do nothing on leaf', () => {
    const steps = [newThought('a'), newSubthought('b'), uncategorize({})]

    const state = initialState()
    const stateNew = reducerFlow(steps)(state)
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
  })

  it('uncategorize context with single child', () => {
    const steps = [newThought('a'), newSubthought('b'), newSubthought('c'), cursorBack, uncategorize({})]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - c`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'c'])
  })

  it('uncategorize context with multiple children', () => {
    const steps = [
      newThought('a'),
      newSubthought('k'),
      newThought('b'),
      newSubthought('c'),
      newThought('d'),
      cursorBack,
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - k
    - c
    - d`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'c'])
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
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - c
    - d
    - x`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'c'])
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
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - c
    - d`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'c'])
  })

  it('after uncategorize context set cursor to the first visible children.', () => {
    const steps = [
      newThought('a'),
      newSubthought('b'),
      newSubthought('=x'),
      newThought('c'),
      cursorBack,
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'c'])
  })

  it('after uncategorize context set cursor to the parent if there are no visible children.', () => {
    const steps = [newThought('a'), newSubthought('b'), newSubthought('=x'), cursorBack, uncategorize({})]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a'])
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
      setCursor(['a', '']),
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${''}
      - b`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', ''])
  })

  it('preserve order of children', () => {
    const steps = [
      newThought('x'),
      newThought('y'),
      // create children of y in reverse order
      newSubthought('c'),
      newThought({ value: 'b', insertBefore: true }),
      newThought({ value: 'a', insertBefore: true }),
      cursorBack,
      newThought('z'),
      // collapse y
      setCursor(['y']),
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
  - b
  - c
  - z`)
  })

  it('preserve sort order of children in sorted context', () => {
    const text = `
      - =sort
        - Alphabetical
      - a
      - c
      - f
      - x
        - e
        - b
        - d
    `
    const state1 = importText({ text })(initialState())
    const a1 = contextToThought(state1, ['a'])!
    const c1 = contextToThought(state1, ['c'])!
    const f1 = contextToThought(state1, ['f'])!

    const steps = [setCursor(['x']), uncategorize({})]
    const stateNew = reducerFlow(steps)(state1)
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
  - a
  - b
  - c
  - d
  - e
  - f`)

    const a2 = contextToThought(stateNew, ['a'])!
    const b2 = contextToThought(stateNew, ['b'])!
    const c2 = contextToThought(stateNew, ['c'])!
    const d2 = contextToThought(stateNew, ['d'])!
    const e2 = contextToThought(stateNew, ['e'])!
    const f2 = contextToThought(stateNew, ['f'])!

    // sibling ranks are unchanged
    expect(a2.rank).toEqual(a1.rank)
    expect(c2.rank).toEqual(c1.rank)
    expect(f2.rank).toEqual(f1.rank)

    // no duplicate ranks
    const ranks = new Set([a2.rank, b2.rank, c2.rank, d2.rank, e2.rank, f2.rank])
    expect(ranks.size).toEqual(6)
  })

  it('should re-sort parent context when uncategorizing a thought with sort attribute', () => {
    const steps = [
      importText({
        text: `
          - c
          - b
            - =sort
              - Alphabetical
                - Asc
            - a
        `,
      }),
      setCursor(['b']),
      uncategorize({}),
      setCursor(null),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
      - Asc
  - a
  - c`)
  })

  it('should not re-sort parent context when uncategorizing a thought with sort set to None', () => {
    const steps = [
      importText({
        text: `
          - c
          - b
            - =sort
              - None
            - a
        `,
      }),
      setCursor(['b']),
      uncategorize({}),
      setCursor(null),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - None
  - c
  - a`)
  })

  it('prevents switching to manual sort order when uncategorizing', () => {
    const steps = [
      importText({
        text: `
        - d
        - c
        - b
          - =sort
            - Alphabetical
              - Asc
          - a
          - e
          - g
        - f
        `,
      }),
      setCursor(['b']),
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
      - Asc
  - a
  - c
  - d
  - e
  - f
  - g`)
  })
})

describe('context view', () => {
  it('uncategorize context', () => {
    const text = `
      - a
        - m
          - x
      - b
        - test
          - m
            - y
    `
    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'test']),
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'b'])
  })

  it('uncategorize context subthought in context view', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
            - z
    `
    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b', 'y']),
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - z`)
  })
})

describe('uncategorizing contexts with meta attributes', () => {
  it('should delete =pin when uncategorizing a context', () => {
    const steps = [
      importText({
        text: `
          - a
            - b
              - =pin
                - true
              - c
            - d
          - e
        `,
      }),
      setCursor(['a', 'b']),
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - c
    - d
  - e`)
  })

  it('should delete =children/=pin when uncategorizing a context', () => {
    const steps = [
      importText({
        text: `
          - a
            - b
              - =children
                - =pin
                  - true
              - c
            - d
          - e
        `,
      }),
      setCursor(['a', 'b']),
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - c
    - d
  - e`)
  })

  it('should keep =children if it has remaining children after uncategorizing', () => {
    const steps = [
      importText({
        text: `
          - a
            - b
              - =children
                - =pin
                  - true
                - =test
                  - value
              - c
            - d
          - e
        `,
      }),
      setCursor(['a', 'b']),
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =children
      - =test
        - value
    - c
    - d
  - e`)
  })

  it('should move meta attributes to the top when uncategorizing a context', () => {
    const steps = [
      importText({
        text: `
          - =x
          - a
          - b
            - =y
            - c
        `,
      }),
      setCursor(['b']),
      uncategorize({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =x
  - =y
  - a
  - c`)
  })
})
