import Index from './IndexType'
import ThoughtId from './ThoughtId'
import Timestamp from './Timestamp'

/** An single thought in local state that contains a map of children ThoughtIds. A different type, ThoughtDb is persisted to storage. */
interface Thought {
  archived?: Timestamp
  // meta attributes keyed by value, otherwise keyed by ThoughtId
  childrenMap: Index<ThoughtId>
  // persisted properties (See: ThoughtDb)
  id: ThoughtId
  lastUpdated: Timestamp
  parentId: ThoughtId
  // non-persisted properties (local state only)
  pending?: boolean
  rank: number
  // takes precedence over value for sorting purposes
  // used to preserve the sort order of thoughts that are edited to empty instead of moving them back to their insertion point
  sortValue?: string
  // used to track if a space is required when merging two siblings/thoughts
  splitSource?: ThoughtId
  /** The public key of the user defined by a hash of their private access token. See: clientId (yjs/index.ts). */
  updatedBy: string
  value: string
}

export default Thought
