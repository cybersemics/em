import type { OperationId } from '@treecrdt/interface'
import Index from './IndexType'
import Thought from './Thought'
import ThoughtId from './ThoughtId'
import ThoughtspaceView from './ThoughtspaceView'

/** Synchronous document commands scoped to one atomic editor action. */
interface ThoughtspaceTransaction {
  /** Accepted-operation offset at this boundary, including operations authored during this transaction. */
  readonly operationOffset: number
  /** Identifies document operations authored so far in this transaction. */
  readonly operationIds: readonly OperationId[]
  /** Authored text changes for undo policy. Insert/delete count as content; moves and metadata are neutral. */
  readonly textChange?: 'formatting' | 'content'
  /** Reads invalidations across captured/observed boundaries; reset requires comparing the complete document. */
  getChanges: () => {
    thoughtIds: readonly ThoughtId[]
    /** Parents whose raw child order changed, including payload-less children. */
    childrenChangedIds: readonly ThoughtId[]
    reset: boolean
  }
  /** Authors compensating operations and returns their IDs for redo. */
  revert: (operationIds: readonly OperationId[]) => readonly OperationId[]
  /** Inserts a thought after the named sibling, or first when null. */
  insert: (thought: Thought, afterId: ThoughtId | null) => void
  /** Changes only the supplied persisted fields of an existing thought. */
  payload: (
    id: ThoughtId,
    fields: Partial<Pick<Thought, 'value' | 'created' | 'lastUpdated' | 'updatedBy' | 'archived'>>,
  ) => void
  /** Changes topology without rewriting the thought's payload. */
  move: (id: ThoughtId, placement: { parentId: ThoughtId; afterId: ThoughtId | null }) => void
  /** Deletes an existing thought; missing thoughts are ignored. */
  delete: (id: ThoughtId) => void
  /** Applies a batch in property order, requiring parents and placement anchors before dependents; deletions run last. */
  update: (changes: {
    thoughtIndexUpdates: Index<Thought | null>
    movePlacements?: Index<ThoughtId | null>
  }) => ThoughtspaceView
  /** Reads the current canonical document and its derived lexemes. */
  project: () => ThoughtspaceView
  /** Reads this boundary's previous values until the synchronous transaction callback returns. */
  capturePrevious: () => Omit<ThoughtspaceView, 'getLexeme' | 'revision'>
  /** Runs only after this whole transaction has been durably persisted. */
  afterPersist: (callback: () => void) => void
}

export default ThoughtspaceTransaction
