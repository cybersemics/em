import type ThoughtIndices from '../@types/ThoughtIndices'
import type ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'

/** Synchronous document access backed by asynchronous persistence. */
interface DataProvider {
  /** Reads the canonical document, preserving transient editor overlays from the supplied view. */
  project: (view?: ThoughtIndices) => ThoughtIndices
  /** Runs an atomic command synchronously; persisted resolves after storage acknowledges its operations. */
  transact: <T>(work: (transaction: ThoughtspaceTransaction) => T) => { value: T; persisted: Promise<void> }
}

export default DataProvider
