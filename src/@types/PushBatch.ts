import Index from './IndexType'
import Lexeme from './Lexeme'
import Path from './Path'
import RecentlyEditedTree from './RecentlyEditedTree'
import Thought from './Thought'
import ThoughtId from './ThoughtId'

/** Defines a single batch of updates added to the push queue. */
interface PushBatch {
  /** Callback for when the updates have been synced with IDB. */
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
   * If local and remote are false, null updates will still cause the YJS providers to be destroyed to free up memory.
   * In particular, this is used by the freeThoughts middleware.
   * (The freeThoughts middleware calls the freeThoughts reducer when the cache limit has been reached. The reducer calls deleteThought with local:false and remote:false, which creates a batch that triggers freeThought/freeLexeme in the pushQueue).
   */
  local?: boolean
  /** Contains the path of the pending thought to be deleted and all its siblings. Siblings may be resurrected from the pull, and the parent has already been deleted, so we need to store them to be deleted in flushDeletes. */
  pendingDeletes?: { path: Path; siblingIds: ThoughtId[] }[]
  recentlyEdited?: RecentlyEditedTree
  /**
   * Update the remote server.
   * Default: true.
   * Set to false to free memory (See: local).
   */
  remote?: boolean
  thoughtIndexUpdates: Index<Thought | null>
  /** Arbitrary updates: use with caution! */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates?: Index<any>
}

export default PushBatch
