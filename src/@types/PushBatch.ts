import Index from './IndexType'
import Lexeme from './Lexeme'
import Path from './Path'
import RecentlyEditedTree from './RecentlyEditedTree'
import Thought from './Thought'
import ThoughtId from './ThoughtId'

/** Defines a single batch of updates added to the push queue. */
interface PushBatch {
  /** Callback invoked after provider persistence has completed. */
  idbSynced?: () => void
  lexemeIndexUpdates: Index<Lexeme | null>
  /**
   * Needed to determine deleted Lexeme.contexts.
   * Undefined if Lexeme is completely new.
   */
  lexemeIndexUpdatesOld: Index<Lexeme | undefined>
  /**
   * Update the local device.
   * Default: true.
   * If local and remote are false, null updates only deallocate entries from Redux/provider cache.
   * In particular, this is used by the freeThoughts middleware.
   */
  local?: boolean
  /** Contains the path of the pending thought to be deleted and all its siblings. Siblings may be resurrected from the pull, and the parent has already been deleted, so we need to store them to be deleted in flushDeletes. */
  pendingDeletes?: { path: Path; siblingIds: ThoughtId[] }[]
  recentlyEdited?: RecentlyEditedTree
  /**
   * Update the remote server.
   * Default: true.
   * Set to false together with local:false for cache-only deallocation (See: local).
   */
  remote?: boolean
  thoughtIndexUpdates: Index<Thought | null>
  /** For treecrdt: per-moved-thought placement. Key = moved thought id, value = id of sibling after which to place (null = first). */
  movePlacements?: Index<ThoughtId | null>
  /** Arbitrary updates: use with caution! */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates?: Index<any>
}

export default PushBatch
