import State from '../../@types/State'
import contextToPath from '../../selectors/contextToPath'
import toggleMulticursor from '../../test-helpers/toggleMulticursorAtFirstMatch'
import hashPath from '../../util/hashPath'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'

/** Returns the multicursor set expected to contain exactly the given unranked paths. */
const expectedMulticursors = (state: State, pathsUnranked: string[][]) =>
  Object.fromEntries(
    pathsUnranked.map(pathUnranked => {
      const path = contextToPath(state, pathUnranked)!
      return [hashPath(path), path]
    }),
  )

describe('toggleMulticursor', () => {
  // https://github.com/cybersemics/em/issues/3561
  it('deselects the selected children when their parent is selected', () => {
    const steps = [
      importText({
        text: `
          - a
            - b
            - c
        `,
      }),
      toggleMulticursor(['a', 'b']),
      toggleMulticursor(['a', 'c']),
      toggleMulticursor(['a']),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual(expectedMulticursors(stateNew, [['a']]))
  })

  it('deselects selected deeper descendants when their ancestor is selected', () => {
    const steps = [
      importText({
        text: `
          - a
            - b
              - c
          - d
        `,
      }),
      toggleMulticursor(['a', 'b', 'c']),
      toggleMulticursor(['d']),
      toggleMulticursor(['a']),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual(expectedMulticursors(stateNew, [['a'], ['d']]))
  })

  it('deselects selected thoughts at a deeper depth under a different parent', () => {
    const steps = [
      importText({
        text: `
          - a
          - x
            - y
        `,
      }),
      toggleMulticursor(['x', 'y']),
      toggleMulticursor(['a']),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual(expectedMulticursors(stateNew, [['a']]))
  })

  it('deselects selected thoughts at a shallower depth under a different parent', () => {
    const steps = [
      importText({
        text: `
          - a
          - x
            - y
        `,
      }),
      toggleMulticursor(['a']),
      toggleMulticursor(['x', 'y']),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual(expectedMulticursors(stateNew, [['x', 'y']]))
  })

  it('deselects the selected parent when its child is selected', () => {
    const steps = [
      importText({
        text: `
          - a
            - b
        `,
      }),
      toggleMulticursor(['a']),
      toggleMulticursor(['a', 'b']),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual(expectedMulticursors(stateNew, [['a', 'b']]))
  })

  it('keeps selected thoughts at the same depth under a different parent', () => {
    const steps = [
      importText({
        text: `
          - a
            - b
          - x
            - y
        `,
      }),
      toggleMulticursor(['a', 'b']),
      toggleMulticursor(['x', 'y']),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual(
      expectedMulticursors(stateNew, [
        ['a', 'b'],
        ['x', 'y'],
      ]),
    )
  })
})
