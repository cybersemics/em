import _ from 'lodash'
import SortPreference from '../@types/SortPreference'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { getAllChildrenSorted } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import keyValueBy from '../util/keyValueBy'
import updateThoughts from './updateThoughts'

/** Sorts a context. If no sort preference is provided, sorts by its =sort attribute. */
const sort = (state: State, id: ThoughtId, sortPreference?: SortPreference): State => {
  sortPreference = sortPreference || getSortPreference(state, id)
  if (sortPreference?.type === 'None') return state

  const children = getAllChildrenSorted(state, id)

  // Get children in their current rank order to compare with the desired sorted order.
  // Sort by rank to determine the current sequence of thoughts.
  const childrenByRank = [...children].sort((a, b) => a.rank - b.rank)

  // No-op if the children are already in the correct sorted order (same sequence of IDs).
  // This also handles the case where ranks are non-zero or gapped (e.g. 5, 6, 7) but in the
  // correct relative order—do not normalize ranks unless the order itself must change.
  if (children.every((child, i) => child.id === childrenByRank[i].id)) return state

  // Only include thoughts whose rank actually changes after normalization to 0, 1, 2, ...
  const thoughtIndexUpdates = keyValueBy(children, (child, i) =>
    child.rank !== i ? { [child.id]: { ...child, rank: i } } : null,
  )

  if (Object.keys(thoughtIndexUpdates).length === 0) return state

  return updateThoughts(state, {
    thoughtIndexUpdates,
    lexemeIndexUpdates: {},
    preventExpandThoughts: true,
  })
}

export default _.curryRight(sort, 2)
