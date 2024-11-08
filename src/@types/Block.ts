import Timestamp from './Timestamp'

/**
 * Type for text-block-parser.
 * Waiting on PR: https://github.com/reergymerej/block-parser/pull/1.
 */
interface Block {
  children: Block[]
  created?: Timestamp
  lastUpdated?: Timestamp
  scope: string
}

export default Block
