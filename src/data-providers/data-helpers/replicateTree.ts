import Index from '../../@types/IndexType'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import taskQueue from '../../util/taskQueue'
import { replicateChildren, replicateThought } from '../yjs/thoughtspace.main'

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

  /** Accumulated index of replicated thoughts. */
  const thoughtIndexAccum: Index<Thought> = {}

  /** Internal variable used to stop recursion when the cancel function is called. */
  let abort = false

  // replicate the starting thought of the export individually (should already be cached)
  replicateThought(id, { background: true, remote }).then(startThought => {
    thoughtIndexAccum[id] = startThought!
    onThought?.(startThought!, thoughtIndexAccum)

    /** Creates a task to replicate all children of the given id and add them to the thoughtIndex. Queues up grandchildren replication. */
    const replicateDescendantsTask = (id: ThoughtId) => async () => {
      if (abort) return
      const children = (await replicateChildren(id, { background: true, remote })) || []
      if (abort) return

      children.forEach(child => {
        thoughtIndexAccum[child.id] = child
        onThought?.(child, thoughtIndexAccum)

        queue.add([
          {
            function: replicateDescendantsTask(child.id),
            description: `replicateTree: ${child.id}`,
          },
        ])
      })
    }

    // kick off the descendant replication by enqueueing a task for start thought's children
    queue.add([
      {
        function: replicateDescendantsTask(id),
        description: `replicateTree: ${id}`,
      },
    ])
  })

  return {
    promise: queue.end.then(() => thoughtIndexAccum),
    cancel: () => {
      queue.clear()
      abort = true
    },
  }
}

export default replicateTree
