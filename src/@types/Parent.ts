import { Child } from './Child'
import { Context } from './Context'
import { Timestamp } from './Timestamp'

/** An object that contains a list of children within a context. */
export interface Parent {
  id: string
  value: string
  context: Context
  children: Child[]
  lastUpdated: Timestamp
  pending?: boolean
}
