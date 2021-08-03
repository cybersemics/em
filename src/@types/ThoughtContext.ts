import { Timestamp } from './Timestamp'

/** An entry in thoughtIndex[].contexts. */
export interface ThoughtContext {
  rank: number
  lastUpdated?: Timestamp
  id: string
  archived?: Timestamp
}
