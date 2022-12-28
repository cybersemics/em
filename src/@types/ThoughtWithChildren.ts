import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'
import Timestamp from '../@types/Timestamp'

interface ThoughtWithChildren {
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

export default ThoughtWithChildren
