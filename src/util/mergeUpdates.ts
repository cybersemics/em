import Index from '../@types/IndexType'

/** Merge two objects together, deleting falsey updates without mutating either argument. */
const mergeUpdates = <T>(mergeInto: Index<T | null>, mergee: Index<T | null>): Index<T> =>
  Object.entries(mergee).reduce(
    (merged, [key, value]) => {
      if (value) merged[key] = value
      else delete merged[key]
      return merged
    },
    { ...mergeInto },
  ) as Index<T>

export default mergeUpdates
