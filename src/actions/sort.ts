import Index from '../@types/IndexType'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import { getAllChildrenSorted } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import command from '../util/command'
import keyValueBy from '../util/keyValueBy'
import updateThoughts from './updateThoughts'

/** Sorts a context. If no sort preference is provided, sorts by its =sort attribute. */
const sort = (state: State, id: ThoughtId, document?: ThoughtspaceTransaction): State => {
  const sortPreference = getSortPreference(state, id)
  if (sortPreference?.type === 'None') return state

  // Empty and emoji-only thoughts are normally sorted to their point of creation, but applying the sort re-ranks
  // every child, so the sort condition is applied to them as well. This floats empty thoughts to the top (#4000).
  const children = getAllChildrenSorted(state, id, { sortEmpty: true })

  // Get children in their current rank order to compare with the desired sorted order.
  // Sort by rank to determine the current sequence of thoughts.
  const childrenByRank = [...children].sort((a, b) => a.rank - b.rank)

  // No-op if the children are already in the correct sorted order (same sequence of IDs).
  // This also handles the case where ranks are non-zero or gapped (e.g. 5, 6, 7) but in the
  // correct relative order—do not normalize ranks unless the order itself must change.
  if (children.every((child, i) => child.id === childrenByRank[i].id)) return state

  // Submit only changed positions; numeric ranks are derived from the resulting tree.
  const thoughtIndexUpdates = keyValueBy(children, (child, i) =>
    child.id !== childrenByRank[i].id ? { [child.id]: child } : null,
  )

  if (Object.keys(thoughtIndexUpdates).length === 0) return state

  const movePlacements: Index<ThoughtId | null> = keyValueBy(children, (child, i) =>
    child.id in thoughtIndexUpdates ? { [child.id]: i === 0 ? null : children[i - 1].id } : null,
  )

  return updateThoughts(
    state,
    {
      thoughtIndexUpdates,
      movePlacements,
      preventExpandThoughts: true,
    },
    document,
  )
}

export default command(sort)
