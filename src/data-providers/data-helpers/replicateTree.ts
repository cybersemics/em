import Index from '../../@types/IndexType'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import taskQueue from '../../util/taskQueue'
import db from '../treecrdt/thoughtspace'

/** Replicates an entire subtree, starting at a given thought. Replicates in the background (not populating the Redux state). */
const replicateTree = (
  id: ThoughtId,
  {
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
  const replicateDescendantsRecursive = async (parentId: ThoughtId) => {
    if (abort) return
    const parentThought = await db.getThoughtById(parentId)
    if (abort || !parentThought) return

    const childIds = Object.values(parentThought.childrenMap)
    if (childIds.length === 0) return

    const children = await db.getThoughtsByIds(childIds)
    if (abort) return

    children.forEach(child => {
      if (child) {
        thoughtIndexAccum[child.id] = child
        onThought?.(child, thoughtIndexAccum)

        queue.add({
          function: () => replicateDescendantsRecursive(child.id),
          description: `replicateTree: ${child.id}`,
        })
      }
    })
  }

  /** Replicates the starting thoughts and all descendants by populating the initial replication queue and waiting for all tasks to resolve. */
  const replicateDescendants = async () => {
    queue.add([
      {
        function: async () => {
          const startThought = await db.getThoughtById(id)

          if (!startThought) {
            throw new Error(`Thought ${id} not replicated. Either replication is broken or this is a timing issue.`)
          }

          thoughtIndexAccum[id] = startThought
          onThought?.(startThought, thoughtIndexAccum)
        },
        description: `replicateTree: ${id} (starting thought)`,
      },
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
