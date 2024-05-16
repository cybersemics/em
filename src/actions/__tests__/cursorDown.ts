import State from '../../@types/State'
import cursorDown from '../../actions/cursorDown'
import importText from '../../actions/importText'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import toggleAttribute from '../../actions/toggleAttribute'
import toggleContextView from '../../actions/toggleContextView'
import contextToPath from '../../selectors/contextToPath'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import pathToContext from '../../util/pathToContext'
import reducerFlow from '../../util/reducerFlow'

describe('normal view', () => {
  it('move cursor to next sibling', () => {
    const steps = [newThought('a'), newThought('b'), setCursor(['a']), cursorDown]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['b'])
  })

  it('move cursor from parent first child', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursor(['a']), cursorDown]

    const stateNew = reducerFlow(steps)(initialState())
    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
  })

  it('move to first root child when there is no cursor', () => {
    const steps = [newThought('a'), newThought('b'), setCursor(null), cursorDown]

    const stateNew = reducerFlow(steps)(initialState())
    expectPathToEqual(stateNew, stateNew.cursor, ['a'])
  })

  it('do nothing when there are no thoughts', () => {
    const stateNew = cursorDown(initialState())

    expect(stateNew.cursor).toBe(null)
  })

  it('move cursor to next uncle', () => {
    const steps = [newThought('a'), newThought('b'), setCursor(['a']), newSubthought('a1'), cursorDown]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['b'])
  })

  it('move cursor to nearest uncle', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['a']),
      newSubthought('a1'),
      newSubthought('a1.1'),
      newSubthought('a1.1.1'),
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    expectPathToEqual(stateNew, stateNew.cursor, ['b'])
  })

  it('work for sorted thoughts', () => {
    const steps = [
      newThought('a'),
      newSubthought('n'),
      newThought('m'),
      setCursor(['a']),
      (state: State) =>
        toggleAttribute(state, { path: contextToPath(state, ['a']), values: ['=sort', 'Alphabetical'] }),
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm'])
  })
})

describe('context view', () => {
  it('move cursor from context view to first context', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `

    const steps = [importText({ text }), setCursor(['a', 'm']), toggleContextView, cursorDown]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'a'])
  })

  it('move cursor from context view to next thought if there are no contexts', () => {
    const text = `
      - a
        - m
        - n
    `

    const steps = [importText({ text }), setCursor(['a', 'm']), toggleContextView, cursorDown]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'n'])
  })

  it("move cursor to cyclic context's first child", () => {
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
      setCursor(['a', 'm', 'a']),
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'a', 'x'])
  })

  it("move cursor to cyclic context's first child (deep)", () => {
    const text = `
      - one
        - two
          - three
            - a
              - m
                - x
            - b
              - m
                - y
    `

    const steps = [
      importText({ text }),
      setCursor(['one', 'two', 'three', 'a', 'm']),
      toggleContextView,
      setCursor(['one', 'two', 'three', 'a', 'm', 'a']),
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['one', 'two', 'three', 'a', 'm', 'a', 'x'])
  })

  it("move cursor to tangential context's first child", () => {
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
      setCursor(['b', 'm']),
      toggleContextView,
      setCursor(['b', 'm', 'a']),
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['b', 'm', 'a', 'x'])
  })

  it("move cursor from a context to its sibling, if there aren't any children", () => {
    const text = `
      - a
        - m
      - b
        - m
    `

    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a']),
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'b'])
  })

  it("move cursor from context's one child to its sibling", () => {
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
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toBeDefined()
    expect(pathToContext(stateNew, stateNew.cursor!)).toMatchObject(['a', 'm', 'b', 'z'])
  })

  it("move cursor from context's last child to uncle context", () => {
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
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'b'])
  })

  it("move cursor from context's last descendant to next sibling if there aren't any further contexts", () => {
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
      cursorDown,
    ]

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
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a', 'x']),
      cursorDown,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toBeDefined()
    expect(pathToContext(stateNew, stateNew.cursor!)).toMatchObject(['a', 'm', 'a', 'y'])
  })

  it('should not move cursor if the cursor on last thought', () => {
    const text = `
      - a
      - b
    `

    const steps = [importText({ text }), setCursor(['b']), cursorDown]

    const stateNew = reducerFlow(steps)(initialState())

    expect(pathToContext(stateNew, stateNew.cursor!)).toMatchObject(['b'])
  })
})
