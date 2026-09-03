import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import head from '../util/head'
import documentSort from './documentSort'

/** Returns the thought ids of the current multicursor selection in document order. When both an ancestor and one of its descendants are selected, only the ancestor is included (the descendant is already copied as part of the ancestor's subtree). */
const getMulticursorThoughtIds = (state: State): ThoughtId[] => {
  const paths = documentSort(state, Object.values(state.multicursors))

  const filteredPaths = paths.reduce<Path[]>((acc, cur) => {
    const hasAncestor = acc.some(p => cur.includes(head(p)))
    if (hasAncestor) return acc
    return [...acc.filter(p => !p.includes(head(cur))), cur]
  }, [])

  return filteredPaths.map(path => head(path))
}

export default getMulticursorThoughtIds
