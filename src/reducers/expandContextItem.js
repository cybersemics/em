// util
import {
  equalItemsRanked,
} from '../util.js'

export const expandContextItem = ({ expandedContextItem }, { itemsRanked }) => ({
  expandedContextItem: equalItemsRanked(expandedContextItem, itemsRanked)
    ? null
    : itemsRanked
})
