import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'

/** Derives an explicit TreeCRDT afterId from em's rank ordering, i.e. the last child of the destination context that sorts before the given rank. Returns null if the thought will be the first child. The destination's ranked children are the single source of truth for placement: resolving afterId from any other ordering (e.g. the rendered order, which omits hidden thoughts and follows the context's sort preference) can yield the moved thought itself or a thought that is not a child of the destination, both of which moveThought rejects. */
const getAfterIdByRank = (
  state: State,
  destinationId: ThoughtId,
  {
    rank,
    sourceId,
  }: {
    /** The rank that the thought will have in the destination context. */
    rank: number
    /** The thought being moved. It is excluded from the candidates so that a thought that is already a child of the destination is never placed after itself. */
    sourceId: ThoughtId
  },
): ThoughtId | null =>
  getChildrenRanked(state, destinationId)
    .filter(child => child.id !== sourceId && child.rank < rank)
    .at(-1)?.id ?? null

export default getAfterIdByRank
