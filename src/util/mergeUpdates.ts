import { Index } from '../types'

/** Merge two objects together, deleting falsey values. Does not overwrite non-pending objects with pending objects.
 *
 * @param mergeInto    The cloned object that will be merged into and deleted from.
 * @param mergee       The object to merge which may have falsey values.
 */
export const mergeUpdates = <T>(mergeInto: Index<T | null>, mergee: Index<T | null>): Index<T> => {
  // assume an optional pending property
  type MaybePending = T & { pending?: boolean }

  const mergeResult = { ...mergeInto }

  Object.entries(mergee).forEach(([key, value]) => {
    if (value) {
      // ignore pending objects that would overwrite non-pending objects
      if (!(value as MaybePending).pending || !mergeInto[key] || (mergeInto[key] as MaybePending).pending) {
        mergeResult[key] = value
      }
    } else {
      delete mergeResult[key] // eslint-disable-line fp/no-delete
    }
  })

  // falsey values have been deleted
  return mergeResult as Index<T>
}
