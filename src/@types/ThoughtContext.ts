import { Context } from './Context'
import { Timestamp } from './Timestamp'

/** An entry in thoughtIndex[].contexts. */
export interface ThoughtContext {
  context: Context
  rank: number
  lastUpdated?: Timestamp
  id: string
  archived?: Timestamp
}
