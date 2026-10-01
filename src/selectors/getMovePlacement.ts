import _ from 'lodash'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenRanked } from './getChildren'

/** Derives an explicit sibling placement from em's rank ordering: the id of the sibling that a thought at the given rank belongs after, or null when it belongs first. The persistence layer stores sibling order structurally rather than as a number, so a rank change only reaches storage when the batch carries one of these. */
const getMovePlacement = (
  state: State,
  parentId: ThoughtId,
  {
    id,
    rank,
    rankedChildren = getChildrenRanked(state, parentId),
  }: {
    /** The thought being placed. It is excluded from its siblings so that it is never placed after itself. */
    id: ThoughtId
    /** The rank the thought is being given. */
    rank: number
    /** Reuses the parent's children when the caller has already read them in rank order. */
    rankedChildren?: readonly Thought[]
  },
): ThoughtId | null => _.findLast(rankedChildren, child => child.id !== id && child.rank < rank)?.id ?? null

export default getMovePlacement
