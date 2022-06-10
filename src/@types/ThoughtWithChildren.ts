import { Index, Thought, ThoughtId, Timestamp } from '../@types'

// a Thought stored with all its children for efficient read/write
export interface ThoughtWithChildren {
  id: ThoughtId
  value: string
  rank: number
  parentId: ThoughtId
  children: Index<Thought> // key and value are of type ThoughtId
  lastUpdated: Timestamp
  archived?: Timestamp
  updatedBy: string
}
