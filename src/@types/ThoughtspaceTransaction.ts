import type { OperationId } from '@treecrdt/interface'
import Index from './IndexType'
import Thought from './Thought'
import ThoughtId from './ThoughtId'
import ThoughtspaceView from './ThoughtspaceView'

/** Synchronous document commands scoped to one atomic editor action. */
interface ThoughtspaceTransaction {
  /** Identifies document operations authored so far in this transaction. */
  readonly operationIds: readonly OperationId[]
  /** Reads cumulative invalidations; reset requires comparing the complete document. */
  getChanges: () => {
    thoughtIds: readonly ThoughtId[]
    /** Parents whose raw child order changed, including payload-less children. */
    childrenChangedIds: readonly ThoughtId[]
    reset: boolean
  }
  /** Authors compensating operations and returns their IDs for redo. */
  revert: (operationIds: readonly OperationId[]) => readonly OperationId[]
  /** Applies document changes and returns their canonical view before the next command runs. */
  update: (changes: {
    thoughtIndexUpdates: Index<Thought | null>
    movePlacements?: Index<ThoughtId | null>
  }) => ThoughtspaceView
  /** Reads the current canonical document and its derived lexemes. */
  project: () => ThoughtspaceView
  /** Runs only after this whole transaction has been durably persisted. */
  afterPersist: (callback: () => void) => void
}

export default ThoughtspaceTransaction
