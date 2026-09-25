import type ThoughtIndices from '../@types/ThoughtIndices'
import createMemoryThoughtspace from './treecrdt/createMemoryThoughtspace'

/** Storage lifetime requested from the active thoughtspace provider. */
export type ThoughtspaceStorage = 'memory' | 'persistent'

export type ThoughtspaceRuntimeInitOptions = {
  storage: ThoughtspaceStorage
  /** Publishes an immutable memory-engine projection; never a storage readback. */
  onChange?: (thoughts: ThoughtIndices) => void
  /** Reports a runtime failure that prevents accepting further document edits. */
  onError?: (error: Error) => void
}

export type ThoughtspaceAccessBlockedReason = 'already-open' | 'unsupported'

export type ThoughtspaceAccessResult =
  { status: 'acquired' } | { status: 'blocked'; reason: ThoughtspaceAccessBlockedReason }

/** The active thoughtspace runtime implementation. */
export const thoughtspaceRuntime = createMemoryThoughtspace()
