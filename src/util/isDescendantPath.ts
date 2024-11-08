import Path from '../@types/Path'
import isRoot from './isRoot'

/** Returns true if thoughts subset is contained within superset (inclusive by default). Returns false if either path is null. */
const isDescendantPath = (
  descendant: Path | null,
  ancestor: Path | null,
  { exclusive }: { exclusive?: boolean } = {},
) => {
  if (
    !descendant ||
    !ancestor ||
    descendant.length < ancestor.length ||
    (exclusive && descendant.length === ancestor.length)
  )
    return false

  return isRoot(ancestor) || ancestor.every((id, i) => descendant[i] === id)
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
