import State from '../../@types/State'
import importText from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import getContextsSortedAndRanked from '../../selectors/getContextsSortedAndRanked'
import getThoughtById from '../../selectors/getThoughtById'
import initialState from '../../util/initialState'

const FIXED_HOME_ROOT_VALUE = '00000000000000000000000000000001'

/** Updates a thought value in the reducer state used by selector tests. */
const setThoughtValue = (state: State, id: string, value: string): State => ({
  ...state,
  thoughts: {
    ...state.thoughts,
    thoughtIndex: {
      ...state.thoughts.thoughtIndex,
      [id]: {
        ...state.thoughts.thoughtIndex[id],
        value,
      },
    },
  },
})

describe('getContextsSortedAndRanked', () => {
  it.each([HOME_TOKEN, FIXED_HOME_ROOT_VALUE])(
    'does not let root token value affect top-level context order: %s',
    rootValue => {
      const text = `
        - a
          - m
            - x
        - v
          - b
            - m
              - y
      `

      const state = importText(initialState(), { text })
      const vId = contextToThoughtId(state, ['v'])
      const bId = contextToThoughtId(state, ['v', 'b'])

      if (!vId || !bId) throw new Error('Failed to set up context sort fixture.')

      const stateWithFormattedContext = [HOME_TOKEN, vId, bId].reduce(
        (stateAcc, id) =>
          setThoughtValue(
            stateAcc,
            id,
            id === HOME_TOKEN
              ? rootValue
              : id === vId
                ? '<font color="#ff573d">v</font>'
                : '<font color="#00d688">b</font>',
          ),
        state,
      )

      const contextParentValues = getContextsSortedAndRanked(stateWithFormattedContext, 'm').map(
        thought => getThoughtById(stateWithFormattedContext, thought.parentId)?.value,
      )

      expect(contextParentValues).toEqual(['a', '<font color="#00d688">b</font>'])
    },
  )
})
