// util
import {
  equalPath,
} from '../util'

export default ({ expandedContextThought }, { thoughtsRanked }) => ({
  expandedContextThought: equalPath(expandedContextThought, thoughtsRanked)
    ? null
    : thoughtsRanked
})
