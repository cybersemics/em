import { Child } from './Child'
import { Timestamp } from './Timestamp'

/** An object that contains a list of children within a context. */
export interface Parent {
  id: string
  value: string
  parentId: string
  children: Child[]
  lastUpdated: Timestamp
  pending?: boolean
}
