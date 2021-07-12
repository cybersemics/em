import { State } from '../types'

/** Clear expand bottom. */
const clearExpandBottom = (state: State): State => ({
  ...state,
  expandedBottom: {},
  expandHoverBottomPaths: {},
})

export default clearExpandBottom
