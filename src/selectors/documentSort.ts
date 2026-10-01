import ComparatorValue from '../@types/ComparatorValue'
import Path from '../@types/Path'
import State from '../@types/State'
import sort from '../util/sort'

/** Sorts thoughts in document order. Returns a new array of paths. */
const documentSort = (state: State, paths: Path[]) => {
  return sort(paths, (a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const aRank = state.thoughts.getPosition(a[i]) ?? 0
      const bRank = state.thoughts.getPosition(b[i]) ?? 0
      if (aRank !== bRank) return (aRank - bRank) as ComparatorValue
    }
    return (a.length - b.length) as ComparatorValue
  })
}

export default documentSort
