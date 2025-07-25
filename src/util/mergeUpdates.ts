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

      // Determine if the incoming object has its own pending property.
      const hasPendingProp = Object.prototype.hasOwnProperty.call(value as object, 'pending')

      const blockPending = !overwritePending && currentPending === false && incomingPending === true

      if (!blockPending && (overwritePending || !currentPending || (hasPendingProp && incomingPending !== undefined))) {
        // If we are allowing the overwrite, but want to preserve pending === false, explicitly set it.
        mergeResult[key] = blockPending ? ({ ...(value as object), pending: false } as T) : value
      } else if (blockPending) {
        // Merge all properties *except* the pending flag so that we retain the non-pending state.
        const { pending: _discard, ...rest } = value as MaybePending
        mergeResult[key] = { ...(mergeInto[key] as object), ...rest } as T
      }
      // else retain existing pending object
    } else {
      delete mergeResult[key]
    }
  })

  // falsey values have been deleted
  return mergeResult as Index<T>
}

export default mergeUpdates
