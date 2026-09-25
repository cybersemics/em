import type { OperationId } from '@treecrdt/interface'
import Index from './IndexType'
import Thought from './Thought'
import ThoughtId from './ThoughtId'
import ThoughtIndices from './ThoughtIndices'

/** Synchronous document commands scoped to one atomic editor action. */
interface ThoughtspaceTransaction {
  /** Identifies document operations authored so far in this transaction. */
  readonly operationIds: readonly OperationId[]
  /** Authors compensating operations and returns their IDs for redo. */
  revert: (operationIds: readonly OperationId[]) => readonly OperationId[]
  /** Applies document changes and returns their canonical view before the next command runs. */
  update: (
    changes: {
      thoughtIndexUpdates: Index<Thought | null>
      movePlacements?: Index<ThoughtId | null>
    },
    view?: ThoughtIndices,
  ) => ThoughtIndices
  /** Reads the current document while preserving transient editor overlays. */
  project: (view?: ThoughtIndices) => ThoughtIndices
  /** Runs only after this whole transaction has been durably persisted. */
  afterPersist: (callback: () => void) => void
}

export default ThoughtspaceTransaction
