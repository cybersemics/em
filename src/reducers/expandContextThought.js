// util
import {
  equalPath,
} from '../util'

/** Sets the expanded context thought if it matches the given path. */
export default (state, { thoughtsRanked }) => ({
  ...state,
  expandedContextThought: equalPath(state.expandedContextThought, thoughtsRanked)
    ? null
    : thoughtsRanked
})
