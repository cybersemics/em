// util
import {
  equalPath,
} from '../util.js'

export const expandContextThought = ({ expandedContextThought }, { thoughtsRanked }) => ({
  expandedContextThought: equalPath(expandedContextThought, thoughtsRanked)
    ? null
    : thoughtsRanked
})
