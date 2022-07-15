import Index from './IndexType'
import Lexeme from './Lexeme'
import Path from './Path'
import RecentlyEditedTree from './RecentlyEditedTree'
import Thought from './Thought'

/** Defines a single batch of updates added to the push queue. */
interface PushBatch {
  lexemeIndexUpdates: Index<Lexeme | null>
  local?: boolean
  // path of the thought that needs to be pulled before being deleted
  pendingDeletes?: Path[]
  pendingLexemes?: Index<boolean>
  recentlyEdited?: RecentlyEditedTree
  remote?: boolean
  thoughtIndexUpdates: Index<Thought | null>
  // arbitrary updates: use with caution!
  updates?: Index<any>
}

export default PushBatch
