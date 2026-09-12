import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenRanked } from './getChildren'

/** Derives an explicit sibling placement from em's rank ordering: the id of the sibling that a thought at the given rank belongs after, or null when it belongs first. The persistence layer stores sibling order structurally rather than as a number, so a rank change only reaches storage when the batch carries one of these. */
const getMovePlacement = (
  state: State,
  parentId: ThoughtId,
  {
    id,
    rank,
  }: {
    /** The thought being placed. It is excluded from its siblings so that it is never placed after itself. */
    id: ThoughtId
    /** The rank the thought is being given. */
    rank: number
  },
): ThoughtId | null =>
  getChildrenRanked(state, parentId)
    .filter(child => child.id !== id && child.rank < rank)
    .at(-1)?.id ?? null

export default getMovePlacement
