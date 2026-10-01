import type ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import type ThoughtspaceView from '../@types/ThoughtspaceView'

/** Synchronous document access backed by asynchronous persistence. */
interface DataProvider {
  /** Reads the canonical document and its derived lexemes. */
  project: () => ThoughtspaceView
  /**
   * Invalidates reads after completed local and incoming changes. Subscribers read the latest project(), not a
   * historical event payload; reentrant commits may invalidate it more than once. Initialization and cleanup are explicit.
   */
  subscribe: (listener: () => void) => () => void
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
