import type ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import type ThoughtspaceView from '../@types/ThoughtspaceView'

/** Synchronous document access backed by asynchronous persistence. */
interface DataProvider {
  /** Reads the canonical document and its derived lexemes. */
  project: () => ThoughtspaceView
  /** Runs an atomic command synchronously; persisted resolves after storage acknowledges its operations. */
  transact: <T>(work: (transaction: ThoughtspaceTransaction) => T) => { value: T; persisted: Promise<void> }
}

export default DataProvider
