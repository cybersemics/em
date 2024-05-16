import importText from '../../actions/importText'
import toggleContextView from '../../actions/toggleContextView'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import cursorBack from '../cursorBack'
import cursorForward from '../cursorForward'
import newSubthought from '../newSubthought'
import newThought from '../newThought'

describe('normal view', () => {
  it('reverse cursorBack', () => {
    const steps = [newThought('a'), newSubthought('b'), cursorBack, cursorForward]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
  })

  it('move to first child if there is no history', () => {
    const steps = [newThought('a'), newSubthought('b'), newThought('c'), setCursor(['a']), cursorForward]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
  })

  it('move to first child if there is no cursor', () => {
    const steps = [newThought('a'), setCursor(null), cursorForward]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a'])
  })
})

describe('context view', () => {
  it('reverse cursorBack', () => {
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
      cursorBack,
      cursorForward,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'b'])
  })

  it('move to first context if there is no history', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `
    const steps = [importText({ text }), setCursor(['a', 'm']), toggleContextView, cursorForward]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'a'])
  })

  it('move to first context if history cursor is not in the context view', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `
    const steps = [importText({ text }), setCursor(['a', 'm', 'x']), cursorBack, toggleContextView, cursorForward]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'a'])
  })

  it('move to the first thought if history cursor is in the context view and the context view has been closed', () => {
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
      cursorBack,
      toggleContextView,
      cursorForward,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'x'])
  })

  it('move from context child to grandchild if there is no history', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `
    const steps = [importText({ text }), setCursor(['b', 'm']), toggleContextView, cursorForward, cursorForward]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['b', 'm', 'a', 'x'])
  })
})
