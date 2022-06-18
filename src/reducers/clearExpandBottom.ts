import State from '../@types/State'

/** Clear expand bottom. */
const clearExpandBottom = (state: State): State => ({
  ...state,
  expandedBottom: {},
  expandHoverBottomPaths: {},
})

export default clearExpandBottom
