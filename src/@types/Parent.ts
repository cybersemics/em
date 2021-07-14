import { Child } from './Child'
import { Context } from './Context'
import { Timestamp } from './Timestamp'

/** An object that contains a list of children within a context. */
export interface Parent {
  id?: string
  children: Child[]
  context: Context
  lastUpdated: Timestamp
  pending?: boolean
  updatedBy?: string
}
