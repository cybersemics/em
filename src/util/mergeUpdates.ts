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

  const mergeResult: Index<T | null> = { ...mergeInto }

  /** Determine if we should allow overwrite based on pending logic. */
  const shouldOverwrite = (currentPending: boolean | undefined, incomingPending: boolean | undefined) => {
    const hasIncomingPending = incomingPending !== undefined
    // Scenarios:
    // 1. overwritePending is true: always allow overwrite (original behaviour).
    // 2. currentPending === true: allow overwrite so that pending can be cleared.
    // 3. currentPending === false && incomingPending === true: block overwrite to keep non-pending state.
    // 4. currentPending === false && incomingPending === false/undefined: allow overwrite (other fields may update).
    return overwritePending || currentPending !== false || (hasIncomingPending && incomingPending !== true)
  }

  /** Returns true if a pending parent should be cleared because all its direct children exist. */
  const shouldClearPending = (val: MaybePending | null, index: Index<MaybePending | null>) => {
    if (
      val &&
      val.pending === true &&
      typeof val === 'object' &&
      'childrenMap' in val &&
      typeof (val as { childrenMap: unknown }).childrenMap === 'object'
    ) {
      const childIds = Object.values((val as { childrenMap: Record<string, string> }).childrenMap)
      return childIds.length > 0 && childIds.every(cid => !!index[cid])
    }
    return false
  }

  let mayClearPending = false

  // Merge the incoming updates into the existing state.
  for (const [key, value] of Object.entries(mergee)) {
    if (!value) {
      delete mergeResult[key]
      continue
    }

    const incomingPending = (value as MaybePending).pending
    const currentPending = (mergeInto[key] as MaybePending)?.pending

    if (shouldOverwrite(currentPending, incomingPending)) {
      mergeResult[key] = value
    } else {
      // Merge all properties except the pending flag so that we retain the non-pending state.
      const { pending: _discard, ...rest } = value as MaybePending
      mergeResult[key] = { ...(mergeInto[key] as object), ...rest } as T
    }

    // If any mergee entry is a pending parent, we might need to run the second loop
    if ((value as MaybePending)?.pending && 'childrenMap' in (value as object)) {
      mayClearPending = true
    }
  }

  // Only scan for pending clearing if needed
  if (mayClearPending) {
    const typedResult = mergeResult as unknown as Index<MaybePending | null>
    for (const [key, val] of Object.entries(typedResult)) {
      if (shouldClearPending(val, typedResult)) {
        // replace with new object to avoid mutating frozen state
        mergeResult[key] = { ...(val as object), pending: false } as T
      }
    }
  }

  return mergeResult as Index<T>
}

export default mergeUpdates
