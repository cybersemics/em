import Index from '../@types/IndexType'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Timestamp from '../@types/Timestamp'

// a Thought stored with all its children for efficient read/write
interface ThoughtWithChildren {
  id: ThoughtId
  value: string
  rank: number
  parentId: ThoughtId
  children: Index<Thought> // key and value are of type ThoughtId
  lastUpdated: Timestamp
  archived?: Timestamp
  updatedBy: string
}

export default ThoughtWithChildren
