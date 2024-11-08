import Index from '../../@types/IndexType'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import taskQueue from '../../util/taskQueue'
import { replicateChildren, replicateThought } from '../yjs/thoughtspace'

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
  cancel: () => void
} => {
  // no significant performance gain above concurrency 4
  const queue = taskQueue<void>({ concurrency: 4 })

  /** Accumulated index of replicated thoughts. */
  const thoughtIndexAccum: Index<Thought> = {}

  /** Internal variable used to stop recursion when the cancel function is called. */
  let abort = false

  /** Creates a task to replicate all children of the given id and add them to the thoughtIndex. Queues up grandchildren replication. */
  const replicateDescendantsRecursive = async (id: ThoughtId) => {
    if (abort) return
    const children = await replicateChildren(id, { background: true, remote })
    if (abort) return

    children?.forEach(child => {
      thoughtIndexAccum[child.id] = child
      onThought?.(child, thoughtIndexAccum)

      queue.add({
        function: () => replicateDescendantsRecursive(child.id),
        description: `replicateTree: ${child.id}`,
      })
    })
  }

  /** Replicates the starting thoughts and all descendants by populating the initial replication queue and waiting for all tasks to resolve. */
  const replicateDescendants = async () => {
    // kick off the descendant replication by enqueueing a task for start thought's children
    queue.add([
      // replicate the starting thought individually (should already be cached)
      {
        function: async () => {
          const startThought = await replicateThought(id, { background: true, remote })

          if (!startThought) {
            throw new Error(`Thought ${id} not replicated. Either replication is broken or this is a timing issue.`)
          }

          thoughtIndexAccum[id] = startThought
          onThought?.(startThought, thoughtIndexAccum)
        },
        description: `replicateTree: ${id} (starting thought)`,
      },
      // replicate the starting thought's children
      {
        function: () => replicateDescendantsRecursive(id),
        description: `replicateTree: ${id}`,
      },
    ])

    await queue.end

    return thoughtIndexAccum
  }

  return {
    promise: replicateDescendants(),
    cancel: () => {
      queue.clear()
      abort = true
    },
  }
}

export default replicateTree
