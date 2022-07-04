import Index from './IndexType'
import Lexeme from './Lexeme'
import Path from './Path'
import RecentlyEditedTree from './RecentlyEditedTree'
import Thought from './Thought'

/** Defines a single batch of updates added to the push queue. */
interface PushBatch {
  lexemeIndexUpdates: Index<Lexeme | null>
  local?: boolean
  pendingDeletes?: Path[]
  pendingLexemes?: Index<boolean>
  pendingPulls?: Path[]
  recentlyEdited?: RecentlyEditedTree
  remote?: boolean
  thoughtIndexUpdates: Index<Thought | null>
  updates?: Index<string>
}

export default PushBatch
