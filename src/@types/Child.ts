import { Timestamp } from './Timestamp'

/** A thought with a specific rank. */
export interface Child {
  id: string
  rank: number
  value: string
  lastUpdated?: Timestamp
  archived?: Timestamp
}
