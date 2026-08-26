import { AlertType, HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import isContextViewActive from '../../selectors/isContextViewActive'
import addMulticursor from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import categorize from '../categorize'
import importText from '../importText'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import toggleContextView from '../toggleContextView'

describe('normal view', () => {
  it('categorize a thought', () => {
    const steps = [newThought('a'), newSubthought('b'), categorize]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${'' /* prevent trim_trailing_whitespace */}
      - b`)
  })

  it('categorize a thought in the root', () => {
    const steps = [newThought('a'), categorize]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ${'' /* prevent trim_trailing_whitespace */}
    - a`)
  })

  it('categorize with no cursor should do nothing', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursor(null), categorize]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
  })

  it('set cursor on new empty thought', () => {
    const steps = [newThought('a'), newSubthought('b'), categorize]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', ''])
  })

  it('categorize within alphabteically sorted context', () => {
    const steps = [
      importText({
        text: `
      - A
        - =sort
          - Alphabetical
        - B
        - C
        - D
        - E`,
      }),
      setCursor(['A', 'E']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - =sort
      - Alphabetical
    - B
    - C
    - D
    - ${'' /* prevent trim_trailing_whitespace */}
      - E`)
  })
})

describe('context view', () => {
  it('categorize context', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `
    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - ${'' /* prevent trim_trailing_whitespace */}
      - m
        - y`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', ''])
  })

  it('categorize context subthought', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `
    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b', 'y']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - ${''}
        - y`)
  })

  // https://github.com/cybersemics/em/issues/3391
  it('categorize multiselected thoughts in a nested context view', () => {
    const steps = [
      importText({
        text: `
          - a
            - m
              - x
                - f
                - g
          - b
            - m
              - y`,
      }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a', 'x', 'f']),
      addMulticursor(['a', 'm', 'a', 'x', 'f']),
      addMulticursor(['a', 'm', 'a', 'x', 'g']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
        - ${'' /* prevent trim_trailing_whitespace */}
          - f
          - g
  - b
    - m
      - y`)
    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'a', 'x', ''])
    expect(isContextViewActive(stateNew, contextToPath(stateNew, ['a', 'm']))).toBeTruthy()
  })

  // Unlike the test above, the subthought is shown under the context the view was activated from, so its SimplePath
  // shares the prefix the context view is keyed on. That prefix is what the path resolution has to leave alone.
  it('categorize context subthought in the context the context view was activated from', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `
    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a', 'x']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - ${'' /* prevent trim_trailing_whitespace */}
        - x
  - b
    - m
      - y`)
  })

  // In a context view, each row is a different context of the same thought. The rows share a displayed parent — the
  // path whose context view is open — but their real (SimplePath) parents are the separate contexts they represent,
  // so there is no single destination to categorize into and the selection must be refused.
  //
  // Each test asserts the alert before the exported tree, and that order is load-bearing: setCursorFirstMatch sets
  // the cursor to null when contextToPath cannot resolve a path, and categorize then returns state unchanged, so a
  // mistyped path would satisfy the unchanged-tree assertion while exercising nothing. The MulticursorError is only
  // reachable once the cursor and every multicursor have resolved.
  describe('multiple contexts', () => {
    it('disallow categorizing two contexts in a context view, which have different parents', () => {
      const steps = [
        importText({
          text: `
            - a
              - m
                - x
            - b
              - m
                - y`,
        }),
        setCursor(['a', 'm']),
        toggleContextView,
        setCursor(['a', 'm', 'a']),
        addMulticursor(['a', 'm', 'a']),
        addMulticursor(['a', 'm', 'b']),
        categorize,
      ]

      const stateNew = reducerFlow(steps)(initialState())

      expect(stateNew.alert).toMatchObject({
        alertType: AlertType.MulticursorError,
        value: 'Cannot categorize thoughts from different parents.',
      })

      const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

      expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y`)
    })

    it('disallow categorizing three contexts in a context view, which have different parents', () => {
      const steps = [
        importText({
          text: `
            - a
              - m
                - x
            - b
              - m
                - y
            - c
              - m
                - z`,
        }),
        setCursor(['a', 'm']),
        toggleContextView,
        setCursor(['a', 'm', 'a']),
        addMulticursor(['a', 'm', 'a']),
        addMulticursor(['a', 'm', 'b']),
        addMulticursor(['a', 'm', 'c']),
        categorize,
      ]

      const stateNew = reducerFlow(steps)(initialState())

      expect(stateNew.alert).toMatchObject({
        alertType: AlertType.MulticursorError,
        value: 'Cannot categorize thoughts from different parents.',
      })

      const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

      expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y
  - c
    - m
      - z`)
    })

    it('disallow categorizing a context and its ancestor context, which have different parents', () => {
      const steps = [
        importText({
          text: `
            - x
              - m
                - a
                  - m
                    - y`,
        }),
        setCursor(['x', 'm', 'a', 'm']),
        toggleContextView,
        setCursor(['x', 'm', 'a', 'm', 'a']),
        addMulticursor(['x', 'm', 'a', 'm', 'a']),
        addMulticursor(['x', 'm', 'a', 'm', 'x']),
        categorize,
      ]

      const stateNew = reducerFlow(steps)(initialState())

      expect(stateNew.alert).toMatchObject({
        alertType: AlertType.MulticursorError,
        value: 'Cannot categorize thoughts from different parents.',
      })

      const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

      expect(exported).toBe(`- ${HOME_TOKEN}
  - x
    - m
      - a
        - m
          - y`)
    })
  })
})

describe('multicursor', () => {
  it('categorize multiple thoughts', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      newThought('c'),
      newThought('d'),
      addMulticursor(['b']),
      addMulticursor(['c']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - ${'' /* prevent trim_trailing_whitespace */}
    - b
    - c
  - d`)
  })

  it('set cursor on new empty thought', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      newThought('c'),
      setCursor(['b']),
      addMulticursor(['c']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

    expect(cursorThoughts).toMatchObject([{ value: '', rank: expect.any(Number) }])
  })

  it('disallow subcategorizing thoughts from different parents', () => {
    const steps = [
      importText({
        text: `
        - a
          - b
        - c`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['c']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c`)

    expect(stateNew.alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'Cannot categorize thoughts from different parents.',
    })
  })

  it('categorize within alphabetically sorted context', () => {
    const steps = [
      importText({
        text: `
        - A
          - =sort
            - Alphabetical
          - B
          - C
          - D
          - E`,
      }),
      setCursor(['A', 'C']),
      addMulticursor(['A', 'C']),
      addMulticursor(['A', 'D']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - =sort
      - Alphabetical
    - B
    - ${'' /* prevent trim_trailing_whitespace */}
      - C
      - D
    - E`)
  })

  // https://github.com/cybersemics/em/issues/4330
  it('move =view to the new category when all siblings are selected', () => {
    const steps = [
      importText({
        text: `
        - A
          - =view
            - Table
          - B
            - C
          - D
            - E`,
      }),
      setCursor(['A', 'B']),
      addMulticursor(['A', 'B']),
      addMulticursor(['A', 'D']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - ${'' /* prevent trim_trailing_whitespace */}
      - =view
        - Table
      - B
        - C
      - D
        - E`)
  })

  // https://github.com/cybersemics/em/issues/4330
  it('keep =view on the parent when only some siblings are selected', () => {
    const steps = [
      importText({
        text: `
        - A
          - =view
            - Table
          - B
            - C
          - D
            - E`,
      }),
      setCursor(['A', 'B']),
      addMulticursor(['A', 'B']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - =view
      - Table
    - ${'' /* prevent trim_trailing_whitespace */}
      - B
        - C
    - D
      - E`)
  })

  // https://github.com/cybersemics/em/issues/4330
  it('move =pin to the new category when all siblings are selected', () => {
    const steps = [
      importText({
        text: `
        - A
          - =pin
            - true
          - B
            - C
          - D
            - E`,
      }),
      setCursor(['A', 'B']),
      addMulticursor(['A', 'B']),
      addMulticursor(['A', 'D']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - ${'' /* prevent trim_trailing_whitespace */}
      - =pin
        - true
      - B
        - C
      - D
        - E`)
  })

  // https://github.com/cybersemics/em/issues/4330
  it('move =sort to the new category when all siblings are selected', () => {
    const steps = [
      importText({
        text: `
        - A
          - =sort
            - Alphabetical
          - B
            - C
          - D
            - E`,
      }),
      setCursor(['A', 'B']),
      addMulticursor(['A', 'B']),
      addMulticursor(['A', 'D']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - ${'' /* prevent trim_trailing_whitespace */}
      - =sort
        - Alphabetical
      - B
        - C
      - D
        - E`)
  })

  // https://github.com/cybersemics/em/issues/4330
  it('move =children/=pin to the new category when all siblings are selected', () => {
    const steps = [
      importText({
        text: `
        - A
          - =children
            - =pin
              - true
          - B
            - C
          - D
            - E`,
      }),
      setCursor(['A', 'B']),
      addMulticursor(['A', 'B']),
      addMulticursor(['A', 'D']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - ${'' /* prevent trim_trailing_whitespace */}
      - =children
        - =pin
          - true
      - B
        - C
      - D
        - E`)
  })

  // https://github.com/cybersemics/em/issues/4330
  it('move =descendants/=pin to the new category when all siblings are selected', () => {
    const steps = [
      importText({
        text: `
        - A
          - =descendants
            - =pin
              - true
          - B
            - C
          - D
            - E`,
      }),
      setCursor(['A', 'B']),
      addMulticursor(['A', 'B']),
      addMulticursor(['A', 'D']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - ${'' /* prevent trim_trailing_whitespace */}
      - =descendants
        - =pin
          - true
      - B
        - C
      - D
        - E`)
  })

  // https://github.com/cybersemics/em/issues/4330
  it('move only =pin out of =children when =children has other attributes', () => {
    const steps = [
      importText({
        text: `
        - A
          - =children
            - =pin
              - true
            - =style
              - color
                - tomato
          - B
            - C
          - D
            - E`,
      }),
      setCursor(['A', 'B']),
      addMulticursor(['A', 'B']),
      addMulticursor(['A', 'D']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - =children
      - =style
        - color
          - tomato
    - ${'' /* prevent trim_trailing_whitespace */}
      - =children
        - =pin
          - true
      - B
        - C
      - D
        - E`)
  })

  // https://github.com/cybersemics/em/issues/4330
  it('keep =pin on the parent when only some siblings are selected', () => {
    const steps = [
      importText({
        text: `
        - A
          - =pin
            - true
          - B
            - C
          - D
            - E`,
      }),
      setCursor(['A', 'B']),
      addMulticursor(['A', 'B']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - =pin
      - true
    - ${'' /* prevent trim_trailing_whitespace */}
      - B
        - C
    - D
      - E`)
  })
})
