import Index from './IndexType'
import Lexeme from './Lexeme'
import Path from './Path'
import RecentlyEditedTree from './RecentlyEditedTree'
import Thought from './Thought'

/** Defines a single batch of updates added to the push queue. */
interface PushBatch {
  lexemeIndexUpdates: Index<Lexeme | null>
  thoughtIndexUpdates: Index<Thought | null>
  local?: boolean
  remote?: boolean
  recentlyEdited?: RecentlyEditedTree
  pendingDeletes?: { pathParent: Path; thought: Thought }[]
  pendingPulls?: { path: Path }[]
  updates?: Index<string>
  pendingLexemes?: Index<boolean>
}

export default PushBatch
