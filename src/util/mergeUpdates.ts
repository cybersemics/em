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

  /** Remove pending property from an object. */
  const stripPending = (val: MaybePending): T => {
    const { pending: _discard, ...rest } = val
    return rest as T
  }

  /** True if object has a childrenMap and is pending. */
  const isPending = (val: T | null) =>
    !!(val as MaybePending)?.pending && typeof val === 'object' && 'childrenMap' in (val as object)

  // Track parents that might be eligible for pending clearing
  const maybePending = new Set<string>()

  // merge updates and collect pending parents
  const merged: Index<T | null> = (Object.entries(mergee) as [string, T | null][]).reduce<Index<T | null>>(
    (state, [key, value]) => {
      // Delete falsey values
      if (!value) {
        const { [key]: _removed, ...rest } = state
        return rest
      }

      const incomingPending = (value as MaybePending).pending
      const currentPending = (state[key] as MaybePending | undefined)?.pending

      const nextValue: T | null = shouldOverwrite(currentPending, incomingPending)
        ? (value as T)
        : ({ ...(state[key] as object), ...stripPending(value as MaybePending) } as T)

      if (isPending(nextValue)) {
        maybePending.add(key)
      }

      return { ...state, [key]: nextValue }
    },
    { ...mergeInto } as Index<T | null>,
  )

  // Check only tracked parents for pending clearing
  maybePending.forEach(key => {
    const val = merged[key] as MaybePending | null
    if (shouldClearPending(val, merged as Index<MaybePending | null>)) {
      merged[key] = { ...(val as object), pending: false } as T
    }
  })

  return merged as Index<T>
}

export default mergeUpdates
