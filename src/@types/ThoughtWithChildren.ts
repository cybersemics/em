import Index from '../@types/IndexType'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Timestamp from '../@types/Timestamp'

// a Thought stored with all its children for efficient read/write
interface ThoughtWithChildren {
  id: ThoughtId
  value: string
  rank: number
  parentId: ThoughtId
  // stores children inline for read/write efficiency
  // key and value are of type ThoughtId
  // May include pending thoughts. This is necessary because if we omit children or filter them out, then children will be out of sync. This can fixed by saving individual children rather than the entire children object. Until we have a more elegant solution, take care to filter out pending children in getDescendantThoughts to force them to be fetched.
  children: Index<Thought>
  // If inline children are pending when this thought is persisted, save childrenMap instead.
  // Otherwise empty children will be persisted.
  // This particularly occurs when replicating thoughts from remote to local.
  childrenMap?: Index<ThoughtId>
  lastUpdated: Timestamp
  archived?: Timestamp
  updatedBy: string
}

export default ThoughtWithChildren
