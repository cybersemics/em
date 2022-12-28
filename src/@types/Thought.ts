import Index from './IndexType'
import ThoughtId from './ThoughtId'
import Timestamp from './Timestamp'

/** An single thought in local state that contains a map of children ThoughtIds. A different type, ThoughtDb is persisted to storage. */
interface Thought {
  // persisted properties (See: ThoughtDb)
  id: ThoughtId
  value: string
  rank: number
  parentId: ThoughtId
  // meta attributes keyed by value, otherwise keyed by ThoughtId
  childrenMap: Index<ThoughtId>
  lastUpdated: Timestamp
  archived?: Timestamp
  updatedBy: string

  // non-persisted properties (local state only)
  pending?: boolean
  // takes precedence over value for sorting purposes
  // used to preserve the sort order of thoughts that are edited to empty instead of moving them back to their insertion point
  sortValue?: string
  // used to track if a space is required when merging two siblings/thoughts
  splitSource?: ThoughtId
}

export default Thought
