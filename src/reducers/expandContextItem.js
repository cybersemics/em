// util
import {
  equalThoughtsRanked,
} from '../util.js'

export const expandContextItem = ({ expandedContextItem }, { thoughtsRanked }) => ({
  expandedContextItem: equalThoughtsRanked(expandedContextItem, thoughtsRanked)
    ? null
    : thoughtsRanked
})
