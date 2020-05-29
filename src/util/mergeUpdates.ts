import { GenericObject } from "../utilTypes"

/** Merge two objects together, deleting falsey values.
 * @param mergeInto    The cloned object that will be merged into and deleted from.
 * @param mergee       The object to merge which may have falsey values.
 */
export const mergeUpdates = (mergeInto: GenericObject, mergee: GenericObject) => {
  const mergeResult = { ...mergeInto }

  for (const key in mergee) { // eslint-disable-line fp/no-loops
    const value = mergee[key]
    if (value) {
      mergeResult[key] = value
    }
    else {
      delete mergeResult[key] // eslint-disable-line fp/no-delete
    }
  }

  return mergeResult
}
