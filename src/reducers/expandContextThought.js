// util
import {
  equalPath,
} from '../util.js'

export default ({ expandedContextThought }, { thoughtsRanked }) => ({
  expandedContextThought: equalPath(expandedContextThought, thoughtsRanked)
    ? null
    : thoughtsRanked
})
