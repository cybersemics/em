import _ from 'lodash'
import * as Y from 'yjs'
import DocLogAction from '../../@types/DocLogAction'
import Storage from '../../@types/Storage'
import ThoughtId from '../../@types/ThoughtId'
import taskQueue from '../../util/taskQueue'

interface ReplicationResult {
  type: 'thought' | 'lexeme'
  id: ThoughtId | string
  // the delta index that is saved as the replication cursor to enable partial replication
  index: number
}

/** A replication controller that ensures that thought and lexeme updates are efficiently and reliably replicated. Does not dictate the replication method itself, but rather maintains a replication queue for throttled concurrency and a replication cursor for resumability. On load, triggers a replicaton for all thoughts and lexemes that have not been processed (via next). When a new update is received (via log), calls next to process the update. Provides start and pause for full control over when replication is running. */
const replicationController = ({
  autostart = true,
  concurrency = 8,
  doc = new Y.Doc(),
  onEnd,
  onStep,
  next,
  storage,
}: {
  /** If true, start replicating as soon as an update is logged. If false, wait for start to be called. Default: true. */
  autostart?: boolean
  /** Number of thoughts/lexemes to replicate in parallel. Default: 8. */
  concurrency?: number
  /** The doclog Y.Doc that contains thoughtLog and lexemeLog Y.Arrays. */
  // TODO: There is a type mismatch between client and server YJS dependency versions.
  // doc: Y.Doc
  doc: any
  // doc: any
  /** Event that fires when all doclogs in the queue have been processed. Invoked again whenever new updates are added to an empty queue. */
  onEnd?: (total: number) => void
  /** Event that fires after a thought or lexeme has been successfully replicated (See: next). */
  onStep?: ({
    completed,
    index,
    total,
    value,
  }: {
    completed: number
    index: number
    total: number
    value: ReplicationResult
  }) => void
  /** Called whenever the doclog changes from a provider. May be called multiple times if the process is interrupted and the replication cursor is not updated. */
  next: ({ action }: { action: DocLogAction } & ReplicationResult) => Promise<void>
  /** Local storage mechanism to persist the replication cursors on lowStep. These are persisted outside of Yjs and are not supposed to be replicated across devices. They allow a device to create a delta of updated thoughts and lexemes that need to be replicated when it goes back online (similar to a state vector). Updates are throttled. */
  storage: Storage
}) => {
  // thoughtObservationCursor marks the index of the last thought delta that has been observed
  // only needs to be stored in memory
  // used to recalculate the delta slice on multiple observe calls
  // presumably the initial slice up to the replication delta is adequate, but this can handle multiple observes until the replication delta has been reached
  let thoughtObservationCursor = -1
  let lexemeObservationCursor = -1

  // thoughtReplicationCursor marks the number of contiguous delta insertions that have been replicated
  // used to slice the doclog and only replicate new changes
  let thoughtReplicationCursor = -1
  let lexemeReplicationCursor = -1

  // load thoughtReplicationCursor and lexemeReplicationCursor into memory
  const replicationCursorsInitialized = Promise.all([
    Promise.resolve(storage.getItem('thoughtReplicationCursor')).then(value => {
      if (value == null) return
      thoughtReplicationCursor = +value
    }),
    Promise.resolve(storage.getItem('lexemeReplicationCursor')).then(value => {
      if (value == null) return
      lexemeReplicationCursor = +value
    }),
  ])

  /** Persist the thoughtReplicationCursor (throttled). */
  const storeThoughtReplicationCursor = _.throttle(
    (index: number) => storage.setItem('thoughtReplicationCursor', index.toString()),
    100,
    { leading: false },
  )

  /** Persist the persisted lexemeReplicationCursor (throttled). */
  const storeLexemeReplicationCursor = _.throttle(
    (index: number) => storage.setItem('lexemeReplicationCursor', index.toString()),
    100,
    { leading: false },
  )

  /** Updates the thoughtReplicationCursor immediately. Saves it to storage in the background (throttled). */
  const setThoughtReplicationCursor = (index: number) => {
    thoughtReplicationCursor = index
    storeThoughtReplicationCursor(index)
  }

  /** Updates the lexemeReplicationCursor immediately. Saves it to storage in the background (throttled). */
  const setLexemeReplicationCursor = (index: number) => {
    lexemeReplicationCursor = index
    storeLexemeReplicationCursor(index)
  }

  /** A task queue for background replication of thoughts and lexemes. Use .add() to queue a thought or lexeme for replication. Paused during push/pull. Initially paused and starts after the first pull. */
  const replicationQueue = taskQueue<ReplicationResult>({
    autostart,
    concurrency,
    onLowStep: ({ index, value, total }) => {
      if (value.type === 'thought') {
        setThoughtReplicationCursor(value.index)
      } else {
        setLexemeReplicationCursor(value.index)
      }
    },
    onStep,
    onEnd,
    retries: 4,
    timeout: 10000,
  })

  // resolves when the initial subdocs are added and a block is available
  const subdocsAdded = new Promise<void>(resolve => {
    /** Resolves the promise when at least one subdoc is added. */
    const onSubdocs = ({ added }: { added: Set<Y.Doc>; removed: Set<Y.Doc>; loaded: Set<Y.Doc> }) => {
      if (added.size > 0) {
        resolve()
        doc.off('subdocs', onSubdocs)
      }
    }
    doc.on('subdocs', onSubdocs)
  })

  /** Gets the active doclog block (the last one) where new thought and lexeme updates should be logged. Previous blocks are not loaded into memory. */
  const getActiveBlock = async (): Promise<Y.Doc> => {
    await subdocsAdded
    const blocks = doc.getArray('blocks')
    const block = blocks.get(blocks.length - 1)
    return block
  }

  // TODO: Type Y.Arrays once doc is properly typed as Y.Doc
  // const thoughtLog = doc.getArray<[ThoughtId, DocLogAction]>('thoughtLog')
  // const lexemeLog = doc.getArray<[string, DocLogAction]>('lexemeLog')
  doc.on('subdocs', ({ added, removed, loaded }: { added: Set<Y.Doc>; removed: Set<Y.Doc>; loaded: Set<Y.Doc> }) => {
    loaded.forEach(async block => {
      await replicationCursorsInitialized

      // since storage is async, we need to wait for the replication cursor to be initialized before observing doclog updates
      const thoughtLog = block.getArray<any>('thoughtLog')
      const lexemeLog = block.getArray<any>('lexemeLog')

      // Partial replication uses the doclog to avoid replicating the same thought or lexeme in the background on load.
      // Clocks across clients are not monotonic, so we can't slice by clock.
      // Decoding updates gives an array of items, but the target (i.e. thoughtLog or lexemeLog) is not accessible.
      // Therefore, observe the deltas and slice from the replication cursor.
      thoughtLog.observe((e: Y.YArrayEvent<[ThoughtId, DocLogAction]>) => {
        // since the doglogs are append-only, ids are only on .insert
        const deltasRaw: [ThoughtId, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

        // slice from the replication cursor (excluding thoughts that have already been sliced) in order to only replicate changed thoughts
        const deltas = deltasRaw.slice(thoughtReplicationCursor - thoughtObservationCursor)

        // thoughtObservationCursor is updated as soon as the deltas have been seen and the replication tasks are added to the queue
        // thoughtReplicationCursor is updated only on lowStep, when the replication completes.
        thoughtObservationCursor += deltasRaw.length

        // If the change comes from self, do not trigger next, but update the replication cursor.
        // Otherwise, trigger next and the replication cursor will be updated on lowStep.
        if (e.transaction.origin === doc.clientID) {
          setThoughtReplicationCursor(thoughtReplicationCursor + deltas.length)
        } else {
          // generate a map of ThoughtId with their last updated index so that we can ignore older updates to the same thought
          // e.g. if a Lexeme is created, deleted, and then created again, the replicationController will only replicate the last creation
          const replicated = new Map<ThoughtId, number>()
          deltas.forEach(([id], i) => replicated.set(id, i))

          // Get closure over thoughtReplicationCursor so that the ReplicationResult index is correct.
          // Otherwise thoughtReplicationCursor may increase before the task completes.
          const startIndex = thoughtReplicationCursor

          const tasks = deltas.map(([id, action], i) => {
            // ignore older updates to the same thought
            if (i !== replicated.get(id)) return null

            // trigger next (e.g. save the thought locally)
            return async (): Promise<ReplicationResult> => {
              const result: ReplicationResult = { type: 'thought', id, index: startIndex + i + 1 }
              await next({ ...result, action })
              return result
            }
          })

          replicationQueue.add(tasks)
        }

        // See: thoughtLog.observe
        lexemeLog.observe((e: Y.YArrayEvent<[string, DocLogAction]>) => {
          // since the doglogs are append-only, ids are only on .insert
          const deltasRaw: [string, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

          // slice from the replication cursor (excluding lexemes that have already been sliced) in order to only replicate changed lexemes
          // reverse the deltas so that we can mark lexemes as replicated from newest to oldest without an extra filter loop
          const deltas = deltasRaw.slice(lexemeReplicationCursor - lexemeObservationCursor)

          // thoughtObservationCursor is updated as soon as the deltas have been seen and the replication tasks are added to the queue
          // thoughtReplicationCursor is updated only on lowStep, when the replication completes.
          lexemeObservationCursor += deltasRaw.length

          // If the change comes from self, do not trigger next, but update the replication cursor.
          // Otherwise, trigger next and the replication cursor will be updated on lowStep.
          if (e.transaction.origin === doc.clientID) {
            setLexemeReplicationCursor(lexemeReplicationCursor + deltas.length)
          } else {
            // generate a map of Lexeme keys with their last updated index so that we can ignore older updates to the same lexeme
            const replicated = new Map<string, number>()
            deltas.forEach(([key], i) => replicated.set(key, i))

            // Get closure over thoughtReplicationCursor so that the ReplicationResult index is correct.
            // Otherwise thoughtReplicationCursor may increase before the task completes.
            const startIndex = lexemeReplicationCursor

            const tasks = deltas.map(([key, action], i) => {
              // ignore older updates to the same lexeme
              if (i !== replicated.get(key)) return null

              // trigger next (e.g. save the lexeme locally)
              return async (): Promise<ReplicationResult> => {
                const result: ReplicationResult = { type: 'lexeme', id: key, index: startIndex + i + 1 }
                await next({ ...result, action })
                return result
              }
            })

            replicationQueue.add(tasks)
          }
        })
      })
    })
  })

  /** Append thought or lexeme logs to doclog. */
  const log = async ({
    thoughtLogs = [],
    lexemeLogs = [],
  }: {
    thoughtLogs?: [ThoughtId, DocLogAction][]
    lexemeLogs?: [string, DocLogAction][]
  } = {}) => {
    thoughtLogs = thoughtLogs || []
    lexemeLogs = lexemeLogs || []

    if (thoughtLogs.length === 0 && lexemeLogs.length === 0) return

    const block = await getActiveBlock()
    const thoughtLog = block.getArray('thoughtLog')
    const lexemeLog = block.getArray('lexemeLog')

    if (_.isEqual(thoughtLogs[0], thoughtLog.slice(-1)[0])) {
      // eslint-disable-next-line fp/no-mutating-methods
      thoughtLogs.shift()
    }

    if (_.isEqual(lexemeLogs[0], lexemeLog.slice(-1)[0])) {
      // eslint-disable-next-line fp/no-mutating-methods
      lexemeLogs.shift()
    }

    doc.transact(() => {
      if (thoughtLogs.length > 0) {
        // eslint-disable-next-line fp/no-mutating-methods
        thoughtLog.push(thoughtLogs)
      }
      if (lexemeLogs.length > 0) {
        // eslint-disable-next-line fp/no-mutating-methods
        lexemeLog.push(lexemeLogs)
      }
    }, doc.clientID)
  }

  return {
    log,
    pause: () => replicationQueue.pause(),
    start: () => replicationQueue.start(),
  }
}

export default replicationController
