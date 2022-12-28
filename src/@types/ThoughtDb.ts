import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'
import Timestamp from '../@types/Timestamp'

/** A thought that is persisted to storage. */
interface ThoughtDb {
  id: ThoughtId
  value: string
  rank: number
  parentId: ThoughtId
  // meta attributes keyed by value, otherwise keyed by ThoughtId
  childrenMap: Index<ThoughtId>
  lastUpdated: Timestamp
  archived?: Timestamp
  updatedBy: string
}

export default ThoughtDb
