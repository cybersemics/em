import Index from './IndexType'
import Lexeme from './Lexeme'
import Path from './Path'
import RecentlyEditedTree from './RecentlyEditedTree'
import Thought from './Thought'
import ThoughtId from './ThoughtId'

/** Defines a single batch of updates added to the push queue. */
interface PushBatch {
  lexemeIndexUpdates: Index<Lexeme | null>
  local?: boolean
  // contains the path of the pending thought to be deleted and all its siblings. Siblings may be resurrected from the pull, and the parent has already been deleted, so we need to store them to be deleted in flushDeletes.
  pendingDeletes?: { path: Path; siblingIds: ThoughtId[] }[]
  pendingLexemes?: Index<boolean>
  pendingPulls?: Path[]
  recentlyEdited?: RecentlyEditedTree
  remote?: boolean
  thoughtIndexUpdates: Index<Thought | null>
  // arbitrary updates: use with caution!
  updates?: Index<any>
}

export default PushBatch
