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

  /** Determine if we should allow a full overwrite vs a merge that preserves the existing pending flag. */
  const shouldOverwrite = (currentPending: boolean | undefined, incomingPending: boolean | undefined): boolean => {
    // Always allow when caller explicitly requests it.
    if (overwritePending) return true

    // If current is pending (true) or unknown (undefined), allow overwrite so it can be cleared/updated.
    if (currentPending !== false) return true

    // currentPending is explicitly false from here.

    // If the incoming update does not specify pending, do not fully overwrite.
    // This preserves the existing non-pending state while allowing other fields to merge.
    if (incomingPending === undefined) return false

    // If the incoming explicitly sets pending to true, block overwrite to keep non-pending state.
    // Otherwise (incomingPending === false), allow overwrite.
    return incomingPending !== true
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

  // merge updates and collect pending thoughts
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

      // collection of keys to recheck is derived post-merge
      return { ...state, [key]: nextValue }
    },
    { ...mergeInto } as Index<T | null>,
  )

  /** Extract keys for nodes that are still marked as pending in `merged`. */
  const getPendingKeys = (merged: Index<T | null>): string[] =>
    Object.entries(merged)
      .filter(([, v]) => isPending(v as T | null))
      .map(([k]) => k)

  /** Extract parent IDs from `mergee` values (if objects have `parentId`). */
  const getParentIds = (mergee: Index<T | null>): string[] =>
    Object.values(mergee)
      .flatMap(v => {
        if (!v || typeof v !== 'object' || !('parentId' in (v as object))) return []
        const id = (v as { parentId?: string }).parentId
        return id ? [id] : []
      })
      // remove null/undefined
      .filter((id): id is string => !!id)

  /** Collect all keys that should be rechecked after merge. */
  const getKeysToCheck = (merged: Index<T | null>, mergee: Index<T | null>): string[] =>
    Array.from(new Set([...getPendingKeys(merged), ...getParentIds(mergee)]))

  /** Clear `pending` flags for any keys that should no longer be pending. */
  const clearPending = (merged: Index<T | null>, keys: string[]): Index<T | null> =>
    keys.reduce<Index<T | null>>((acc, key) => {
      const val = acc[key] as MaybePending | null
      if (shouldClearPending(val, acc as Index<MaybePending | null>)) {
        return { ...acc, [key]: { ...(val as object), pending: false } as T }
      }
      return acc
    }, merged)

  /** Collect all keys that might need clearing (`pending` nodes + parentIds of updated children). */
  const mergedCleared = clearPending(merged, getKeysToCheck(merged, mergee))

  return mergedCleared as Index<T>
}

export default mergeUpdates
