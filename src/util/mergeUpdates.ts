import Index from '../@types/IndexType'

/** Merge two objects together, deleting falsey values. Does not overwrite non-pending objects with pending objects by default. */
const mergeUpdates = <T>(
  /** The cloned object that will be merged into and deleted from. */
  mergeInto: Index<T | null>,
  /** The object to merge which may have falsey values. */
  mergee: Index<T | null>,
  {
    overwritePending,
  }: {
    /** Allow set pending on non-pending thought. This is mainly used by freeThoughts. */
    overwritePending?: boolean
  } = {},
): Index<T> => {
  // assume an optional pending property
  type MaybePending = T & { pending?: boolean }

  const mergeResult = { ...mergeInto }

  Object.entries(mergee).forEach(([key, value]) => {
    if (value) {
      // ignore pending objects that would overwrite non-pending objects by default
      if (
        overwritePending ||
        !(value as MaybePending).pending ||
        !mergeInto[key] ||
        (mergeInto[key] as MaybePending).pending
      ) {
        mergeResult[key] = value
      }
    } else {
      delete mergeResult[key]
    }
  })

  // falsey values have been deleted
  return mergeResult as Index<T>
}

export default mergeUpdates
