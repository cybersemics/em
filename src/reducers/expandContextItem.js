import { equalItemsRanked } from '../util'

export const expandContextItem = (state) => ({ itemsRanked }) => ({
  expandedContextItem: equalItemsRanked(state.expandedContextItem, itemsRanked)
    ? null
    : itemsRanked
})