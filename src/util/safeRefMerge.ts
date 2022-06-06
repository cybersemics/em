import { Index } from '../@types'

/** Merges two or more objects (last write wins), taking care to preserve object references when some objects are null or undefined. */
export const safeRefMerge = <T extends Index>(...objects: (T | null | undefined)[]): T | null | undefined => {
  if (!objects) return objects
  if (objects.length === 0) return null
  const restMerged = safeRefMerge(...objects.slice(1))
  return !restMerged ? objects[0] : !objects[0] ? restMerged : { ...objects[0], ...restMerged }
}

export default safeRefMerge
