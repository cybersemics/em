import Path from '../@types/Path'
import equalPath from './equalPath'

/** Returns true if thoughts subset is contained within superset (inclusive). */
export const isDescendantPath = (superset: Path | null, subset: Path | null) => {
  if (!superset || !subset || !superset.length || !subset.length || superset.length < subset.length) return false
  if (superset === subset || (superset.length === 0 && subset.length === 0)) return true

  return !!superset.find((_, i) => equalPath(superset.slice(0, i + subset.length) as Path, subset))
}

/** Returns the index of the first element in list that starts with thoughts. */
// const deepIndexContains = (thoughts, list) => {
//   for(let i = 0; i < list.length; i++) {
//     // NOTE: this logic is probably not correct. It is unclear why the match is in the front of the list sometimes and at the end other times. It depends on from. Nevertheless, it is "working" at least for typical use cases.
//     if (
//       // thoughts at beginning of list
//       equalArrays(thoughts, list[i].slice(0, thoughts.length)) ||
//       // thoughts at end of list
//       equalArrays(thoughts, list[i].slice(list[i].length - thoughts.length))
//     ) return i
//   }
//   return -1
// }

export default isDescendantPath
