import State from '../@types/State'
import expandThoughts from '../selectors/expandThoughts'

/** Clear expand bottom. */
const clearExpandBottom = (state: State): State => ({
  ...state,
  expanded: expandThoughts(state, state.cursor),
  expandHoverBottomPaths: {},
})

export default clearExpandBottom
