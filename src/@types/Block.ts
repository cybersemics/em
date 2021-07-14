import { Timestamp } from './Timestamp'

// jex-block-parser type
// Waiting on PR: https://github.com/reergymerej/block-parser/pull/1
export interface Block {
  scope: string
  created?: Timestamp
  lastUpdated?: Timestamp
  children: Block[]
}
