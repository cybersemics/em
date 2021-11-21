import { ThoughtId } from './ThoughtId'
import { Timestamp } from './Timestamp'

/** An object that contains a list of children within a context. */
export interface Parent {
  id: ThoughtId
  value: string
  rank: number
  parentId: ThoughtId
  children: ThoughtId[]
  lastUpdated: Timestamp
  pending?: boolean
  archived?: Timestamp
  updatedBy: string
}
