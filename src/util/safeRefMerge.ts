import Index from '../@types/IndexType'

/** Merges two or more objects (last write wins), preserving object references when objects are null or undefined. If two or more objects are truthy, then a new object reference will be returned. */
const safeRefMerge = <T extends Index>(...objects: (T | null | undefined)[]): T | null | undefined => {
  if (!objects) return objects
  if (objects.length === 0) return null
  const restMerged = safeRefMerge(...objects.slice(1))
  return !restMerged ? objects[0] : !objects[0] ? restMerged : { ...objects[0], ...restMerged }
}

export default safeRefMerge
