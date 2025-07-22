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

      // Do not overwrite a pending object unless:
      // - overwritePending flag is set
      // - The new value explicitly sets pending to true or false (i.e. the property exists)
      //   This prevents accidental clearing of pending when the property is simply omitted.
      // - Or the old object is not pending.
      const hasPendingProp = Object.prototype.hasOwnProperty.call(value as object, 'pending')

      if (
        overwritePending ||
        !currentPending ||
        (hasPendingProp && incomingPending !== undefined)
      ) {
        mergeResult[key] = value
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
