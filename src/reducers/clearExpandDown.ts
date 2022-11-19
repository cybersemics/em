import State from '../@types/State'
import expandThoughts from '../selectors/expandThoughts'

/** Clear expand down. */
const clearExpandDown = (state: State): State => ({
  ...state,
  expanded: expandThoughts(state, state.cursor),
  expandHoverDownPaths: {},
})

export default clearExpandDown
