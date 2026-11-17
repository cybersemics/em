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
  it('deselects selected children when their parent is selected', () => {
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
})
