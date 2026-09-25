import type { OperationId } from '@treecrdt/interface'
import type { Operation } from 'fast-json-patch'
import ActionType from './ActionType'

/** An editor history entry with UI restoration, diagnostic document diffs, and an engine-owned receipt. */
interface Patch {
  /** Restores UI state and describes the document change for history reports. Document paths are never authored back. */
  ops: Operation[]
  /** Action names and command labels remain available even when an entry has no JSON operations. */
  metadata: { actions: ActionType[] }
  /** Exact operations to revert; the opposite history entry receives the fresh inversion receipt. */
  documentOperationIds: readonly OperationId[]
}

export default Patch
