import _ from 'lodash'
import * as Y from 'yjs'
import DocLogAction from '../../@types/DocLogAction'
import ThoughtId from '../../@types/ThoughtId'
import taskQueue from '../../util/taskQueue'

interface ReplicationResult {
  type: 'thought' | 'lexeme'
  id: ThoughtId | string
  // the delta index that is saved as the replication cursor to enable partial replication
  index: number
}

interface Storage {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: any) => void | Promise<void>
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
  doc: Y.Doc
  /** Event that fires when all doclogs in the queue have been processed. Invoked again whenever new updates are added to an empty queue. */
  onEnd?: (total: number) => void
  /** Event that fires after a thought or lexeme has been successfully replicated (See: next). */
  onStep?: ({ completed, total }: { completed: number; total: number }) => void
  /** An asynchronous function that replicates the next thought or lexeme in the queue. May be called multiple times if the process is interrupted and the replication cursor is not updated. */
  next: ({ action }: { action: DocLogAction } & ReplicationResult) => Promise<void>
  /** Local storage mechanism to persist the replication cursors. These are persisted outside of Yjs and are not supposed to be replicated across clients. They allow a device to create a delta of updated thoughts and lexemes that need to be replicated when it it goes back online. Sets are throttled. */
  storage: Storage
}) => {
  const thoughtLog = doc.getArray<[ThoughtId, DocLogAction]>('thoughtLog')
  const lexemeLog = doc.getArray<[string, DocLogAction]>('lexemeLog')

  // thoughtObservationCursor marks the index of the last thought delta that has been observed
  // only needs to be stored in memory
  // used to recalculate the delta slice on multiple observe calls
  // presumably the initial slice up to the replication delta is adequate, but this can handle multiple observes until the replication delta has been reached
  let thoughtObservationCursor = 0
  let lexemeObservationCursor = 0

  // thoughtReplicationCursor marks the number of contiguous delta insertions that have been replicated
  // used to slice the doclog and only replicate new changes
  let thoughtReplicationCursor = 0
  let lexemeReplicationCursor = 0

  // assume storage.getItem completes before thoughtLogs.observe fires
  // otherwise we have to make the replication cursors async
  const replicationCursorsInitialized = Promise.all([
    Promise.resolve(storage.getItem('thoughtReplicationCursor')).then(value => {
      thoughtReplicationCursor = +(value || 0)
    }),
    Promise.resolve(storage.getItem('lexemeReplicationCursor')).then(value => {
      lexemeReplicationCursor = +(value || 0)
    }),
  ])

  const updateThoughtReplicationCursor = _.throttle(
    (index: number) => {
      thoughtReplicationCursor = index + 1
      storage.setItem('thoughtReplicationCursor', (index + 1).toString())
    },
    100,
    { leading: false },
  )
  const updateLexemeReplicationCursor = _.throttle(
    (index: number) => {
      lexemeReplicationCursor = index + 1
      storage.setItem('lexemeReplicationCursor', (index + 1).toString())
    },
    100,
    { leading: false },
  )

  /** A task queue for background replication of thoughts and lexemes. Use .add() to queue a thought or lexeme for replication. Paused during push/pull. Initially paused and starts after the first pull. */
  const replicationQueue = taskQueue<ReplicationResult>({
    autostart,
    onLowStep: ({ index, value }) => {
      if (value.type === 'thought') {
        updateThoughtReplicationCursor(value.index)
      } else {
        updateLexemeReplicationCursor(value.index)
      }
    },
    onStep,
    onEnd,
  })

  // since storage is async, we need to wait for the replication cursor to be initialized before observing doclog updates
  replicationCursorsInitialized.then(() => {
    // Partial replication uses the doclog to avoid replicating the same thought or lexeme in the background on load.
    // Clocks across clients are not monotonic, so we can't slice by clock.
    // Decoding updates gives an array of items, but the target (i.e. thoughtLog or lexemeLog) is not accessible.
    // Therefore, observe the deltas and slice from the replication cursor.
    thoughtLog.observe(e => {
      if (e.transaction.origin === doc.clientID) return
      const startIndex = thoughtReplicationCursor

      // since the doglogs are append-only, ids are only on .insert
      const deltasRaw: [ThoughtId, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      // slice from the replication cursor (excluding thoughts that have already been sliced) in order to only replicate changed thoughts
      const deltas = deltasRaw.slice(startIndex - thoughtObservationCursor)

      // generate a map of ThoughtId with their last updated index so that we can ignore older updates to the same thought
      const replicated = new Map<ThoughtId, number>()
      deltas.forEach(([id], i) => replicated.set(id, i))

      const tasks = deltas.map(([id, action], i) => {
        // ignore older updates to the same thought
        if (i !== replicated.get(id)) return null

        // update or delete the thought
        return async (): Promise<ReplicationResult> => {
          await next({ action, id, index: startIndex + i, type: 'thought' })
          return { type: 'thought', id, index: startIndex + i }
        }
      })

      replicationQueue.add(tasks)
      thoughtObservationCursor += deltasRaw.length
    })

    // See: thoughtLog.observe
    lexemeLog.observe(e => {
      if (e.transaction.origin === doc.clientID) return
      const startIndex = lexemeReplicationCursor

      // since the doglogs are append-only, ids are only on .insert
      const deltasRaw: [string, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      // slice from the replication cursor (excluding lexemes that have already been sliced) in order to only replicate changed lexemes
      // reverse the deltas so that we can mark lexemes as replicated from newest to oldest without an extra filter loop
      const deltas = deltasRaw.slice(startIndex - lexemeObservationCursor)

      // generate a map of Lexeme keys with their last updated index so that we can ignore older updates to the same lexeme
      const replicated = new Map<string, number>()
      deltas.forEach(([key], i) => replicated.set(key, i))

      const tasks = deltas.map(([key, action], i) => {
        // ignore older updates to the same lexeme
        if (i !== replicated.get(key)) return null

        // update or delete the lexeme
        return async (): Promise<ReplicationResult> => {
          await next({ action, id: key, index: startIndex + i, type: 'lexeme' })
          return { type: 'lexeme', id: key, index: startIndex + i }
        }
      })

      replicationQueue.add(tasks)
      lexemeObservationCursor += deltasRaw.length
    })
  })

  /** Append thought or lexeme logs to doclog. */
  const log = ({
    thoughtLogs = [],
    lexemeLogs = [],
  }: {
    thoughtLogs?: [ThoughtId, DocLogAction][]
    lexemeLogs?: [string, DocLogAction][]
  } = {}) => {
    thoughtLogs = thoughtLogs || []
    lexemeLogs = lexemeLogs || []

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
