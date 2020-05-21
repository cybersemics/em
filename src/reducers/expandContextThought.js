// util
import {
  equalPath,
} from '../util'

/** Sets the expanded context thought if it matches the given path. */
export default ({ expandedContextThought }, { thoughtsRanked }) => ({
  expandedContextThought: equalPath(expandedContextThought, thoughtsRanked)
    ? null
    : thoughtsRanked
})
