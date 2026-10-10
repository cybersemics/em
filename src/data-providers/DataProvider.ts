import type ThoughtId from '../@types/ThoughtId'
import type ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import type ThoughtspaceView from '../@types/ThoughtspaceView'

/** Synchronous document access backed by asynchronous persistence. */
interface DataProvider {
  /** Current accepted-operation offset; read transaction.operationOffset during an active command. */
  readonly operationOffset: number
  /** Reads the canonical document and its derived lexemes. */
  project: () => ThoughtspaceView
  /** Reads ordered, non-overlapping operation spans; readers expire after each synchronous callback. */
  readHistory: (
    spans: readonly { from: number; to: number }[],
    visit: (
      history: {
        before: Omit<ThoughtspaceView, 'getLexeme' | 'revision'>
        after: Omit<ThoughtspaceView, 'getLexeme' | 'revision'>
        thoughtIds: readonly ThoughtId[]
        /** Parents whose raw child order changed, including payload-less children. */
        childrenChangedIds: readonly ThoughtId[]
      },
      index: number,
    ) => void,
  ) => void
  /**
   * Invalidates reads after completed local and incoming changes. The previous reader is valid only during the
   * synchronous callback, before any reentrant commit; current values come from project().
   */
  subscribe: (listener: (previous: Omit<ThoughtspaceView, 'getLexeme' | 'revision'>) => void) => () => void
  /**
   * Runs an atomic command synchronously; persisted resolves after storage acknowledges its operations.
   * The optional commit callback runs after persistence is queued and before subscribers, including for no-op
   * commands. Its errors propagate without rolling back the committed document or suppressing notification.
   */
  transact: <T>(
    work: (transaction: ThoughtspaceTransaction) => T,
    onCommit?: (value: T, persisted: Promise<void>) => void,
  ) => { value: T; persisted: Promise<void> }
}

export default DataProvider
