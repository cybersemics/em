import cursorUp from '../../actions/cursorUp'
import importText from '../../actions/importText'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import toggleContextView from '../../actions/toggleContextView'
import toggleHiddenThoughts from '../../actions/toggleHiddenThoughts'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToPath from '../../selectors/contextToPath'
import isContextViewActive from '../../selectors/isContextViewActive'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import pathToContext from '../../util/pathToContext'
import reducerFlow from '../../util/reducerFlow'

describe('normal view', () => {
  it('move cursor to previous sibling', () => {
    const steps = [newThought('a'), newThought('b'), cursorUp]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a'])!)
  })

  it('move cursor to previous attribute when showHiddenThoughts is true', () => {
    const steps = [
      toggleHiddenThoughts,
      newThought('a'),
      newSubthought('b'),
      newThought('=test'),
      newThought('c'),
      cursorUp,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const thoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

    expect(thoughts).toMatchObject([
      { value: 'a', rank: 0 },
      { value: '=test', rank: 1 },
    ])
  })

  it('move cursor from first child to parent', () => {
    const steps = [newThought('a'), newSubthought('b'), cursorUp]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a'])!)
  })

  it('move to last root child when there is no cursor', () => {
    const steps = [newThought('a'), newThought('b'), setCursor(null), cursorUp]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['b'])!)
  })

  it('do nothing when there are no thoughts', () => {
    const stateNew = cursorUp(initialState())

    expect(stateNew.cursor).toBe(null)
  })
})

describe('context view', () => {
  it("move cursor from context's first child to parent", () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `

    const steps = [importText({ text }), setCursor(['a', 'm']), toggleContextView, setCursor(['a', 'm', 'a']), cursorUp]
    const stateNew = reducerFlow(steps)(initialState())

    expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a', 'm'])
  })

  it('move cursor to previous context', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `

    const steps = [importText({ text }), setCursor(['a', 'm']), toggleContextView, setCursor(['a', 'm', 'b']), cursorUp]
    const stateNew = reducerFlow(steps)(initialState())

    expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a', 'm', 'a'])
  })

  it('move cursor from context child to context', () => {
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
      cursorUp,
    ]
    const stateNew = reducerFlow(steps)(initialState())

    expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a', 'm', 'a'])
  })

  it('move cursor from context view to normal sibling', () => {
    const text = `
      - a
        - z
        - m
          - x
      - b
        - m
          - y
    `

    const steps = [importText({ text }), setCursor(['a', 'm']), toggleContextView, cursorUp]
    const stateNew = reducerFlow(steps)(initialState())

    expect(isContextViewActive(stateNew, contextToPath(stateNew, ['a', 'm']))).toBeTruthy()
    expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a', 'z'])
  })
})
