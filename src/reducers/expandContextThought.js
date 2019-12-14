// util
import {
  equalThoughtsRanked,
} from '../util.js'

export const expandContextThought = ({ expandedContextThought }, { thoughtsRanked }) => ({
  expandedContextThought: equalThoughtsRanked(expandedContextThought, thoughtsRanked)
    ? null
    : thoughtsRanked
})
