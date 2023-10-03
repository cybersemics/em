import Index from '../../@types/IndexType'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import globals from '../../globals'
import taskQueue from '../../util/taskQueue'
import { replicateThought } from '../yjs/thoughtspace.main'

/** Replicates an entire subtree, starting at a given thought. Replicates in the background (not populating the Redux state). Does not wait for Websocket to sync. */
const replicateTree = (
  id: ThoughtId,
  {
    remote,
    onThought,
  }: {
    /** Sync with Websocket. Default: true. */
    remote?: boolean
    onThought?: (thought: Thought, thoughtIndex: Index<Thought>) => void
  } = {},
): {
  promise: Promise<Index<Thought>>
  // CancellablePromise use an ad hoc property that cannot cross the worker boundary, so we need to return a cancel function separately from the promise.
  cancel: () => void
} => {
  // no significant performance gain above concurrency 4
  const queue = taskQueue<void>({ concurrency: 4 })
  const thoughtIndex: Index<Thought> = {}
  let abort = false

  /** Creates a task to replicate a thought and add it to the thoughtIndex. Queues up children replication. */
  const replicateTask = (id: ThoughtId) => async () => {
    const thought = await replicateThought(id, { background: true, remote })
    if (!thought || abort) return
    thoughtIndex[id] = thought
    onThought?.(thought, thoughtIndex)

    if (Object.keys(thought.childrenMap).length === 0) return

    // enqueue children
    const childrenReplicated = queue.add(Object.values(thought.childrenMap).map(replicateTask))

    // Preserve the parent until all children have been replicated.
    // Otherwise the parent can be deallocated by freeThought and the docKey will be missing when the task is run.
    globals.preserveSet.add(thought.id)
    childrenReplicated.then(() => {
      globals.preserveSet.delete(id)
    })
  }

  queue.add([replicateTask(id)])

  // return a promise that can cancel the replication
  const promise = queue.end.then(() => thoughtIndex)
  return {
    promise,
    cancel: () => {
      queue.clear()
      abort = true
    },
  }
}

export default replicateTree
