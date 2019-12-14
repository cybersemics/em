/** Ranks the items from 0 to n. */
export const rankItemsSequential = items =>
  items.map((item, i) => ({ key: item, rank: i }))
