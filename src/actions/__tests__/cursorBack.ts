import State from '../../@types/State'
import importText from '../../actions/importText'
import toggleContextView from '../../actions/toggleContextView'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToPath from '../../selectors/contextToPath'
import addMulticursor from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import cursorBack from '../cursorBack'
import cursorForward from '../cursorForward'
import newSubthought from '../newSubthought'
import newThought from '../newThought'

/** Converts the multicursor set to a list of contexts in a readable way. */
const multicursorContexts = (state: State): string[][] =>
  Object.values(state.multicursors).map(path => childIdsToThoughts(state, path).map(thought => thought.value))

it('move cursor to parent', () => {
  const steps = [newThought('a'), newSubthought('b'), cursorBack]

  const stateNew = reducerFlow(steps)(initialState())

  expectPathToEqual(stateNew, stateNew.cursor, ['a'])
})

it('remove cursor from root thought', () => {
  const steps = [newThought('a'), cursorBack]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toEqual(null)
})

// https://github.com/cybersemics/em/issues/3526
describe('multicursor', () => {
  it('select the parents of the selected thoughts', () => {
    const text = `
      - x
        - =children
          - =pin
        - a
          - b
          - c
        - d
          - e
        - f
          - g
    `
    const steps = [
      importText({ text }),
      setCursor(['x', 'a', 'b']),
      addMulticursor(['x', 'a', 'b']),
      addMulticursor(['x', 'a', 'c']),
      addMulticursor(['x', 'd', 'e']),
      cursorBack,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    // b and c share the parent a, which is selected only once
    expect(multicursorContexts(stateNew)).toEqual([
      ['x', 'a'],
      ['x', 'd'],
    ])
  })

  it('select the context view thought when its contexts are selected', () => {
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
      addMulticursor(['a', 'm']),
      // select the contexts a and b of the context view thought m
      cursorForward,
      cursorBack,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(multicursorContexts(stateNew)).toEqual([['a', 'm']])
  })

  it('keep a selected thought selected when it is the parent of another selected thought', () => {
    const text = `
      - x
        - a
          - b
    `
    const steps = [
      importText({ text }),
      setCursor(['x']),
      addMulticursor(['x', 'a']),
      addMulticursor(['x', 'a', 'b']),
      cursorBack,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(multicursorContexts(stateNew)).toEqual([['x'], ['x', 'a']])
  })

  it('do nothing if all of the selected thoughts are in the root context', () => {
    const text = `
      - a
      - b
    `
    const steps = [importText({ text }), setCursor(['a']), addMulticursor(['a']), addMulticursor(['b']), cursorBack]

    const stateNew = reducerFlow(steps)(initialState())

    expect(multicursorContexts(stateNew)).toEqual([['a'], ['b']])
  })

  it('collapse the newly selected parents so that the previously selected children are hidden', () => {
    // x needs a second child, otherwise a is already expanded by the only-child rule
    const text = `
      - x
        - a
          - b
          - c
        - d
    `
    const steps = [
      importText({ text }),
      setCursor(['x']),
      addMulticursor(['x', 'a']),
      // select b and c, which expands their deselected parent a
      cursorForward,
      cursorBack,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(multicursorContexts(stateNew)).toEqual([['x', 'a']])
    expect(stateNew.expanded[hashPath(contextToPath(stateNew, ['x', 'a'])!)]).toBeFalsy()
  })
})
