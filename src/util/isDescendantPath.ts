import Path from '../@types/Path'
import equalPath from './equalPath'

/** Returns true if thoughts subset is contained within superset (inclusive). */
export const isDescendantPath = (
  descendant: Path | null,
  ancestor: Path | null,
  { exclusive }: { exclusive?: boolean } = {},
) => {
  if (!descendant || !ancestor || !descendant.length || !ancestor.length || descendant.length < ancestor.length)
    return false
  if (descendant === ancestor || (descendant.length === 0 && ancestor.length === 0)) return !exclusive

  return !!descendant.find((_, i) => equalPath(descendant.slice(0, i + ancestor.length) as Path, ancestor))
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
