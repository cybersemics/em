import { Timestamp } from './Timestamp'

export interface Log {
  created: Timestamp
  message: string
  stack?: any
}
