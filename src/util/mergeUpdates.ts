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
    /** Allow setting pending on a non-pending thought. Mainly used by freeThoughts. */
    overwritePending?: boolean
  } = {},
): Index<T> => {
  // assume an optional pending property
  type MaybePending = T & { pending?: boolean }

  const mergeResult = { ...mergeInto }

  Object.entries(mergee).forEach(([key, value]) => {
    if (value) {
      const incomingPending = (value as MaybePending).pending
      const currentPending = (mergeInto[key] as MaybePending)?.pending

      // Do not overwrite an explicitly non-pending object with a pending object unless overwritePending is true.
      // This prevents a thought that has finished loading (pending === false) from being set back to pending === true
      // when the DataProvider returns the stale value that still has pending === true. See issue where pending thoughts
      // remain pending indefinitely after navigating to them.

      // Scenarios:
      // 1. overwritePending is true: always allow overwrite (original behaviour).
      // 2. currentPending === true: allow overwrite so that pending can be cleared.
      // 3. currentPending === false && incomingPending === true: block overwrite to keep non-pending state.
      // 4. currentPending === false && incomingPending === false/undefined: allow overwrite (other fields may update).

      // Consider the incoming object to be explicitly setting the pending flag only when the value is defined.
      const hasIncomingPending = incomingPending !== undefined

      // Determine if we should allow overwrite based on pending logic.
      const shouldOverwrite =
        overwritePending || currentPending !== false || (hasIncomingPending && incomingPending !== true)

      if (shouldOverwrite) {
        // If we are allowing the overwrite, but want to preserve pending === false, explicitly set it.
        mergeResult[key] = value
      } else {
        // Merge all properties except the pending flag so that we retain the non-pending state.
        const { pending: _discard, ...rest } = value as MaybePending
        mergeResult[key] = { ...(mergeInto[key] as object), ...rest } as T
      }
      // else retain existing pending object
    } else {
      delete mergeResult[key]
    }
  })

  // Thought-specific pending clearing: If a parent is pending and all its direct children
  // now exist in the merged index, clear the flag.
  const entries = Object.entries(mergeResult) as [string, MaybePending][]
  entries.forEach(([key, val]) => {
    if (val && val.pending === true && 'childrenMap' in val && typeof val.childrenMap === 'object') {
      const childIds = Object.values(val.childrenMap as Record<string, string>)
      if (childIds.length && childIds.every(cid => !!(mergeResult as Index<MaybePending>)[cid])) {
        // replace with new object to avoid mutating frozen state
        mergeResult[key] = { ...(val as object), pending: false } as T
      }
    }
  })

  // falsey values have been deleted
  return mergeResult as Index<T>
}

export default mergeUpdates
