import ComparatorValue from '../@types/ComparatorValue'
import Path from '../@types/Path'
import State from '../@types/State'
import sort from '../util/sort'
import getThoughtById from './getThoughtById'

/** Sorts thoughts in document order. Returns a new array of paths. */
const documentSort = (state: State, paths: Path[]) => {
  return sort(paths, (a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const aRank = getThoughtById(state, a[i])?.rank ?? 0
      const bRank = getThoughtById(state, b[i])?.rank ?? 0
      if (aRank !== bRank) return (aRank - bRank) as ComparatorValue
    }
    return (a.length - b.length) as ComparatorValue
  })
}

export default documentSort
