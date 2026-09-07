import compareByRank from '../util/compareByRank'
import sort from '../util/sort'

/** Test sibling thoughts in rank order by comparing their values. */
const expectThoughts = (thoughts: { rank: number; value: string }[], values: string[]) => {
  expect(sort(thoughts, compareByRank).map(thought => thought.value)).toEqual(values)
}

export default expectThoughts
