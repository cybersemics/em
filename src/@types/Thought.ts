import { Index } from './IndexType'
import { ThoughtId } from './ThoughtId'
import { Timestamp } from './Timestamp'

/** An object that contains a list of children within a context. */
export interface Thought {
  id: ThoughtId
  value: string
  rank: number
  parentId: ThoughtId
  children: ThoughtId[]
  childrenMap?: Index<ThoughtId> // key and value are of type ThoughtId
  lastUpdated: Timestamp
  pending?: boolean
  archived?: Timestamp
  updatedBy: string
  // takes precedence over value for sorting purposes
  // used to preserve the sort order of thoughts that are edited to empty instead of moving them back to their insertion point
  sortValue?: string
  // used to track if a space is required when merging two siblings/thoughts
  splitSource?: ThoughtId
}
