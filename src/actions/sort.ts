import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import { getAllChildrenAsThoughts, getAllChildrenSorted } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import command from '../util/command'
import updateThoughts from './updateThoughts'

/** Sorts a context. If no sort preference is provided, sorts by its =sort attribute. */
const sort = (state: State, id: ThoughtId, transaction?: ThoughtspaceTransaction): State => {
  const sortPreference = getSortPreference(state, id)
  if (sortPreference?.type === 'None') return state

  // Empty and emoji-only thoughts are normally sorted to their point of creation, but applying the sort re-ranks
  // every child, so the sort condition is applied to them as well. This floats empty thoughts to the top (#4000).
  const children = getAllChildrenSorted(state, id, { sortEmpty: true })

  const childrenByRank = getAllChildrenAsThoughts(state, id)

  // No-op if the children are already in the correct sorted order (same sequence of IDs).
  if (children.every((child, i) => child.id === childrenByRank[i].id)) return state

  return updateThoughts(
    state,
    {
      write: transaction =>
        children.forEach((child, i) => {
          if (child.id !== childrenByRank[i].id)
            transaction.move(child.id, { parentId: id, afterId: children[i - 1]?.id ?? null })
        }),
      preventExpandThoughts: true,
    },
    transaction,
  )
}

export default command(sort)
