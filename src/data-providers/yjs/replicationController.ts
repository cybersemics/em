import _ from 'lodash'
import { nanoid } from 'nanoid'
import * as Y from 'yjs'
import DocLogAction from '../../@types/DocLogAction'
import Index from '../../@types/IndexType'
import ReplicationCursor from '../../@types/ReplicationCursor'
import Storage from '../../@types/Storage'
import ThoughtId from '../../@types/ThoughtId'
import keyValueBy from '../../util/keyValueBy'
import sleep from '../../util/sleep'
import taskQueue from '../../util/taskQueue'
import throttleConcat from '../../util/throttleConcat'
import when from '../../util/when'
import { encodeDocLogBlockDocumentName, parseDocumentName } from './documentNameEncoder'

/** Represents replication of a single Thought or Lexeme. Passed to the next callback, and used internally to update the replication cursors. */
interface ReplicationTask {
  type: 'thought' | 'lexeme'
  id: ThoughtId | string
  /* the delta index that is saved as the replication cursor to enable partial replication */
  index: number
  /* doclog block where this object was replicated */
  blockId: string
}

/** Y.Doc subdocs event arguments. */
type SubdocsEventArgs = { added: Set<Y.Doc>; removed: Set<Y.Doc>; loaded: Set<Y.Doc> }

/** Max number of thoughts per doclog block. When the limit is reached, a new block (subdoc) is created to take updates. Only the active block needs to be loaded into memory. */
const DOCLOG_BLOCK_SIZE = 1000

/** Throttle rate of storing the replication cursor after a thought or lexeme has been successfully replicated. */
const STORE_REPLICATION_CURSOR_THROTTLE = 1000

/** A replication controller that ensures that thought and lexeme updates are efficiently and reliably replicated. Does not dictate the replication method itself, but rather maintains a replication queue for throttled concurrency and a replication cursor for resumability. On load, triggers a replicaton for all thoughts and lexemes that have not been processed (via next). When a new update is received (via log), calls next to process the update. Provides start and pause for full control over when replication is running. */
const replicationController = ({
  concurrency = 8,
  // replicationController will wait for first subdoc before observing doclog
  doc,
  onEnd,
  onStep,
  next,
  paused,
  storage,
}: {
  /** If false, start replicating as soon as an update is logged. If true, wait for start to be called. Default: false. */
  paused?: boolean
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
    expected,
    index,
    total,
    value,
  }: {
    completed: number
    expected: number | null
    index: number
    total: number
    value: ReplicationTask
  }) => void
  /** Called whenever the doclog changes from a provider. May be called multiple times if the process is interrupted and the replication cursor is not updated. */
  next: ({ action }: { action: DocLogAction } & ReplicationTask) => Promise<void>
  /** Local storage mechanism to persist the replication cursors on lowStep. These are persisted outside of Yjs and are not supposed to be replicated across devices. They allow a device to create a delta of updated thoughts and lexemes that need to be replicated when it goes back online (similar to a state vector). Updates are throttled. */
  storage: Storage<Index<ReplicationCursor>>
}) => {
  const { tsid } = parseDocumentName(doc.guid)

  // replicationCursor marks the index of the last thought and lexemes deltas that has been observed
  // used to recalculate the delta slice on multiple observe calls
  // presumably the initial slice up to the replication delta is adequate, but this can handle multiple observes until the replication delta has been reached
  let replicationCursors: Index<ReplicationCursor> = {}
  const observationCursors: Index<ReplicationCursor> = {}

  // track which blocks have set up observe handlers, allowing observeBlock to be idempotent
  const blocksObserved = new WeakSet<Y.Doc>()

  // load thoughtReplicationCursor and lexemeReplicationCursor into memory
  const replicationCursorsInitialized = Promise.resolve(storage.getItem('replicationCursors')).then(value => {
    if (value == null) return
    replicationCursors = value
  })

  /** The number of unfilled blocks after subdocs change. This is used to determine when all blocks have been loaded and thus it is safe to switch from estimated total to actual total. */
  // This needs to be tracked in a separate variable due to a timing gap between the subdocs event (when the value is valid) and observeBlock (when the value must be checked). Otherwise the live value is already altered by the time observeBlock is called and we will end up switching to the actual total one block too soon.
  let unfilled = 0

  /** Toggled when the first blocks are added. Used to set the estimated replication total once on initialization. */
  let blocksInitialized = false

  /** Persist the thought replication cursor and update block size if full (throttled). */
  const storeThoughtReplicationCursor = throttleConcat(
    async (cursorUpdates: { blockId: string; index: number }[]) => {
      const replicationCursorUpdates = keyValueBy<{ blockId: string; index: number }, ReplicationCursor>(
        cursorUpdates,
        ({ blockId, index }, i, accum) => ({
          // If there are multiple updates with the same blockId, the last one will win.
          [blockId]: {
            thoughts: index,
            lexemes: accum[blockId]?.lexemes ?? replicationCursors[blockId]?.lexemes ?? -1,
          },
        }),
      )

      storage.setItem('replicationCursors', {
        ...replicationCursors,
        ...replicationCursorUpdates,
      })
    },
    STORE_REPLICATION_CURSOR_THROTTLE,
    { leading: false },
  )

  /** Persist the lexeme replication cursor (throttled). */
  const storeLexemeReplicationCursor = throttleConcat(
    async (cursorUpdates: { blockId: string; index: number }[]) => {
      const replicationCursorUpdates = keyValueBy<{ blockId: string; index: number }, ReplicationCursor>(
        cursorUpdates,
        ({ blockId, index }, i, accum) => ({
          // If there are multiple updates with the same blockId, the last one will win.
          [blockId]: {
            thoughts: accum[blockId]?.thoughts ?? replicationCursors[blockId]?.thoughts ?? -1,
            lexemes: index,
          },
        }),
      )
      storage.setItem('replicationCursors', {
        ...replicationCursors,
        ...replicationCursorUpdates,
      })
    },
    STORE_REPLICATION_CURSOR_THROTTLE,
    { leading: false },
  )

  /** Updates the thoughtReplicationCursor immediately. Saves it to storage in the background (throttled). */
  const setThoughtReplicationCursor = (blockId: string, index: number) => {
    replicationCursors[blockId] = {
      thoughts: index,
      lexemes: replicationCursors[blockId]?.lexemes ?? -1,
    }
    storeThoughtReplicationCursor({ blockId, index })
  }

  /** Updates the lexemeReplicationCursor immediately. Saves it to storage in the background (throttled). */
  const setLexemeReplicationCursor = (blockId: string, index: number) => {
    replicationCursors[blockId] = {
      thoughts: replicationCursors[blockId]?.thoughts ?? -1,
      lexemes: index,
    }
    storeLexemeReplicationCursor({ blockId, index })
  }

  /** Updates the thoughtObservationCursor. */
  const setThoughtObservationCursor = (blockId: string, index: number) => {
    observationCursors[blockId] = {
      thoughts: index,
      lexemes: observationCursors[blockId]?.lexemes ?? -1,
    }
  }

  /** Updates the lexemeObservationCursor. */
  const setLexemeObservationCursor = (blockId: string, index: number) => {
    observationCursors[blockId] = {
      thoughts: observationCursors[blockId]?.thoughts ?? -1,
      lexemes: index,
    }
  }

  /** A task queue for background replication of thoughts and lexemes. Use .add() to queue a thought or lexeme for replication. Paused during push/pull. Initially paused and starts after the first pull. */
  const replicationQueue = taskQueue<ReplicationTask>({
    paused,
    concurrency,
    onLowStep: async ({ value: { blockId, index, type } }) => {
      if (type === 'thought') {
        setThoughtReplicationCursor(blockId, index)
      } else {
        setLexemeReplicationCursor(blockId, index)
      }
    },
    onStep,
    onEnd,
    retries: 4,
    timeout: 10000,
  })

  /** Returns true if a block is full. Detects it from blockSizes if the block is not loaded, and the replication cursors if loaded. Precondition: The replication cursors must be initialized. */
  const isFull = (blockId: string): boolean =>
    (doc.getMap('blockSizes').get(blockId) ?? 0) >= DOCLOG_BLOCK_SIZE ||
    (replicationCursors[blockId]?.thoughts ?? -1) + 1 >= DOCLOG_BLOCK_SIZE ||
    (observationCursors[blockId]?.thoughts ?? -1) + 1 >= DOCLOG_BLOCK_SIZE

  /** Gets the active doclog block where new thought and lexeme updates should be logged. This will typically be the last block, except in the case where multiple new blocks were created on different devices at the same time. In that case it will be the first unfilled block. Previous blocks are not loaded into memory. Precondition: The replication cursors must be initialized. */
  const getActiveBlock = (): Y.Doc => {
    const blocks: Y.Doc[] = doc.getArray('blocks').toArray()

    if (blocks.length === 0) {
      throw new Error(
        'No blocks found in doclog. getActiveBlock should not be called before the doclog is initialized.',
      )
    }

    // Find the first unfilled block.
    // It will usually be the last block, unless two devices create a new block at the same time. In that case, the blocks array will converage and both devices will fill up the first unfilled block before moving to the next.
    const activeBlock = blocks.find(block => !isFull(getBlockKey(block)))

    // If there is no unfilled block, return the last block.
    // Only log() should create a new block, otherwise it can cause an infinite loop.
    return activeBlock || blocks[blocks.length - 1]
  }

  /** Extracts the blockId of the given doclog block from its guid. If no block is provided, gets the active block's blockId. */
  const getBlockKey = (block: Y.Doc): string =>
    // !: blockId must be defined since doclog subdocs always have a guid in the format /TSID/doclog/block/BLOCK_ID
    parseDocumentName(block.guid).blockId!

  const blocksInitializedPromise = new Promise<void>(resolve => {
    // Precondition: The replication cursors must be initialized.
    doc.on('subdocs', async ({ added, removed, loaded }: SubdocsEventArgs) => {
      // load and observe the active block when there are new subdocs
      if (added.size > 0) {
        // When the first blocks are added, estimate the expected number of replications based on the number of blocks.
        // Since unreplicated blocks are only loaded one at a time, we need to provide an estimate to ensure a stable progress %.
        if (!blocksInitialized) {
          // add 1 since blocks can be overfilled
          const estimated = (doc.subdocs.size - Object.values(replicationCursors).length) * (DOCLOG_BLOCK_SIZE + 1)
          if (estimated) {
            replicationQueue.expected(estimated)
          }
          blocksInitialized = true
          resolve()
        }

        const activeBlock = getActiveBlock()
        const activeBlockId = getBlockKey(activeBlock)

        activeBlock.load()
        observeBlock(activeBlock)

        // load, replicate, and subscribe to unreplicated or unfilled blocks
        for (const block of added) {
          const blockId = getBlockKey(block)
          if (blockId === activeBlockId) continue
          const blockSize = doc.getMap('blockSizes').get(blockId)
          const thoughtReplicationCursor = replicationCursors[blockId]?.thoughts ?? -1
          if (thoughtReplicationCursor + 1 < blockSize) {
            block.load()
            observeBlock(block)
          }
        }
      }

      // When a block is removed, delete it from the observed set.
      // It should automatically get deleted by the WeakSet, but in case the block persists in a destroyed state, explicitly delete it.
      removed.forEach(block => {
        blocksObserved.delete(block)
      })

      if (loaded.size > 0) {
        const blocks: Y.Doc[] = doc.getArray('blocks').toArray()
        unfilled = blocks.filter(block => !isFull(getBlockKey(block))).length
      }
    })
  })

  // Load and replicate full blocks that are overfilled due to an offline device coming back online.
  // We need to watch blockSizes for this because blocks are normrally not loaded when full.
  replicationCursorsInitialized.then(() => {
    doc.getMap('blockSizes').observe((e: Y.YMapEvent<number>) => {
      // Ignore self
      // The important origin is WebsocketProvider.
      // We could probably ignore IndexedDBPersistence, but we do not have access to the providers here. The blockSize will only be loaded if there is a discrepancy with the replication cursors (which may actually be a helpful safeguard).
      if (e.transaction.origin === doc.clientID) return
      const blockSizesMap = e.target
      const keysChanged = [...e.keysChanged]

      // need to wait a tick for some reason, otherwise replicationCursors has not yet been updated
      setTimeout(() => {
        keysChanged.forEach(blockId => {
          const blockSize = blockSizesMap.get(blockId)
          if (!blockSize) {
            throw new Error(`Invalid blockSize for block ${blockId}: ${blockSize}`)
          }
          const thoughtReplicationCursor = replicationCursors[blockId]?.thoughts ?? -1
          if (thoughtReplicationCursor + 1 < blockSize) {
            const blocks: Y.Doc[] = doc.getArray('blocks').toArray()
            const block = blocks.find(block => getBlockKey(block) === blockId)
            if (!block) {
              throw new Error(
                `blockSize changed for block ${blockId}, but no block with that id was found in existing blocks: ${blocks
                  .map(getBlockKey)
                  .join(', ')}.`,
              )
            }

            block.load()
            observeBlock(block)
          }
        })
      })
    })
  })

  /** Observes the thoughtLog and lexemeLog of the given block to replicate changes from remote devices. Idempotent. */
  const observeBlock = (block: Y.Doc) => {
    if (blocksObserved.has(block)) return

    const blockId = getBlockKey(block)

    // since storage is async, we need to wait for the replication cursor to be initialized before observing doclog updates
    const thoughtLog = block.getArray<[ThoughtId, DocLogAction]>('thoughtLog')
    const lexemeLog = block.getArray<[string, DocLogAction]>('lexemeLog')

    // Partial replication uses the doclog to avoid replicating the same thought or lexeme in the background on load.
    // Observe the deltas and slice from the replication cursor. (Why not slice directly from thoughtLog instead of the deltas? Because thoughtLog order may change with updates from other devices.)
    // Also, note that we need to observe self updates as well, since local changes still need to get replicated to the remote. The replication cursors must only be updated via onLowStep to ensure that the changes have been synced with the websocket.
    thoughtLog.observe(async (e: Y.YArrayEvent<[ThoughtId, DocLogAction]>) => {
      // Must go before await statement as e.changes is a dynamic property that must be accessed synchronously.
      const deltasRaw: [ThoughtId, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      await replicationCursorsInitialized
      const thoughtReplicationCursor = replicationCursors[blockId]?.thoughts ?? -1
      const thoughtObservationCursor = observationCursors[blockId]?.thoughts ?? -1

      // slice from the replication cursor in order to only replicate changed thoughts
      const deltas = deltasRaw.slice(thoughtReplicationCursor - thoughtObservationCursor)

      // thoughtObservationCursor is updated as soon as the deltas have been seen and the replication tasks are added to the queue
      // thoughtReplicationCursor is updated only on lowStep, when the replication completes.
      setThoughtObservationCursor(blockId, thoughtObservationCursor + deltasRaw.length)

      // Get closure over thoughtReplicationCursor so that the ReplicationTask index is correct.
      // Otherwise thoughtReplicationCursor may increase before the task completes.
      const startIndex = thoughtReplicationCursor

      // Generate a map of Thought ids with their last updated index so that we can ignore older updates to the same thought.
      // Note that this only removes duplicates within the same block, not across blocks, so replicateChildren still needs to be idempotent.
      const replicated = new Map<ThoughtId, number>()
      deltas.forEach(([id], i) => replicated.set(id, i))

      const tasks = deltas.map(([id, action], i) => {
        // ignore older updates the same thought
        if (i !== replicated.get(id)) return null

        // trigger next (e.g. save the thought locally)
        return {
          description: `replicationController: Thought ${id}`,
          function: async (): Promise<ReplicationTask> => {
            const taskData: ReplicationTask = { type: 'thought', id, blockId, index: startIndex + i + 1 }
            await next({ ...taskData, action })
            return taskData
          },
        }
      })

      // replicate changed thoughts
      const added = replicationQueue.add(tasks)

      // switch from expected total to actual total when all blocks are loaded
      // also switch when there are no tasks, which occurs on page load if all blocks are replicated
      if (tasks.length === 0 || unfilled === 1) {
        replicationQueue.expected(null)
      }

      await added

      // Set blockSize on full blocks. This allows devices to check if a block is fully replicated before loading it into memory.
      // Only set blockSize on full blocks to avoid document growth.
      // Only update blockSize after replication to ensure that the block is re-loaded if interrupted by a refresh. This would probably also work in observeBlock, but we might as well do it here where it is throttled.
      if (isFull(blockId)) {
        // wait a tick for replication cursors to be updated
        await sleep(0)
        const thoughtReplicationCursor = replicationCursors[blockId]?.thoughts ?? -1
        const blockSize = doc.getMap('blockSizes').get(blockId) || 0

        // if thoughtReplicationCursor + 1 is greater than blockSize, it means this device filled up the block
        // if thoughtReplicationCursor + 1 is less than blockSize, it means the block was overfilled by another client and we are waiting for local replication
        if (thoughtReplicationCursor + 1 > blockSize) {
          doc.transact(() => {
            doc.getMap('blockSizes').set(blockId, thoughtReplicationCursor + 1)
          }, doc.clientID)
        }

        // Unload full blocks after replication. This is mainly for unloading overfilled blocks, since they are loaded separately and will not get picked up by the "old block" unload logic.
        // Do not unload the active block. It will be unloaded when the new block is created.
        if (block !== getActiveBlock()) {
          block.destroy()
        }
      }
    })

    // See: thoughtLog.observe
    lexemeLog.observe(async (e: Y.YArrayEvent<[string, DocLogAction]>) => {
      // Must go before await statement as e.changes is a dynamic property that must be accessed synchronously.
      const deltasRaw: [string, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      await replicationCursorsInitialized
      const lexemeReplicationCursor = replicationCursors[blockId]?.lexemes ?? -1
      const lexemeObservationCursor = observationCursors[blockId]?.lexemes ?? -1

      // slice from the replication cursor in order to only replicate changed lexemes
      const deltas = deltasRaw.slice(lexemeReplicationCursor - lexemeObservationCursor)

      // thoughtObservationCursor is updated as soon as the deltas have been seen and the replication tasks are added to the queue
      // thoughtReplicationCursor is updated only on lowStep, when the replication completes.
      setLexemeObservationCursor(blockId, lexemeObservationCursor + deltasRaw.length)

      // Generate a map of Lexeme keys with their last updated index so that we can ignore older updates to the same lexeme.
      // Note that this only removes duplicates within the same block, not across blocks, so replicateChildren still needs to be idempotent.
      const replicated = new Map<string, number>()
      deltas.forEach(([key], i) => replicated.set(key, i))

      // Get closure over thoughtReplicationCursor so that the ReplicationTask index is correct.
      // Otherwise thoughtReplicationCursor may increase before the task completes.
      const startIndex = lexemeReplicationCursor

      const tasks = deltas.map(([key, action], i) => {
        // ignore older updates to the same lexeme
        if (i !== replicated.get(key)) return null

        // trigger next (i.e. replicate the thought)
        return {
          description: `replicationController: Lexeme ${key}`,
          function: async (): Promise<ReplicationTask> => {
            const result: ReplicationTask = { type: 'lexeme', blockId, id: key, index: startIndex + i + 1 }
            await next({ ...result, action })
            return result
          },
        }
      })

      replicationQueue.add(tasks)
    })

    blocksObserved.add(block)

    // Emit a custom event on the block so that log can detect when it is safe to push.
    // Otherwise the doclog observe handlers will not be added and the first thought of a new block will not get replicated until there is a refresh.
    block.emit('em:observed' as any, [blockId])
  }

  /** Append thought or lexeme logs to the active doclog block. */
  const log = async ({
    thoughtLogs = [],
    lexemeLogs = [],
  }: {
    /** Update actions use docKey as id. Delete actions use thoughtId as id. */
    thoughtLogs?: [ThoughtId, DocLogAction][]
    lexemeLogs?: [string, DocLogAction][]
  } = {}) => {
    thoughtLogs = thoughtLogs || []
    lexemeLogs = lexemeLogs || []

    if (thoughtLogs.length === 0 && lexemeLogs.length === 0) return

    await replicationCursorsInitialized

    // Wait for the first blocks to be initialized, otherwise getActiveBlock will fail.
    // This mainly occurs in the tests, when log is called immediately after the controller is created.
    await blocksInitializedPromise

    let activeBlock = getActiveBlock()
    let blockId = getBlockKey(activeBlock)

    // if the block is full, create a new block
    // create a new block is active block is full
    if (isFull(blockId)) {
      const blockIdOld = blockId
      const blockOld = activeBlock
      blockId = nanoid(13)
      activeBlock = new Y.Doc({ guid: encodeDocLogBlockDocumentName(tsid, blockId) })
      const observed = when<string>(activeBlock as any, 'em:observed')
      doc.getArray('blocks').push([activeBlock])

      // Wait for the new block subdoc and the observe handlers to be added before pushing.
      // Otherwise the first thought of a new block will not get replicated until there is a refresh.
      await observed

      // if the old block is fully replicated, we can destroy it
      const thoughtReplicationCursorOld = replicationCursors[blockIdOld]?.thoughts ?? -1
      const blockSizeOld = doc.getMap('blockSizes').get(blockIdOld)
      if (thoughtReplicationCursorOld + 1 === blockSizeOld) {
        blockOld.destroy()
      }
    }

    const thoughtLog = activeBlock.getArray<[string, DocLogAction]>('thoughtLog')
    const lexemeLog = activeBlock.getArray<[string, DocLogAction]>('lexemeLog')

    if (_.isEqual(thoughtLogs[0], thoughtLog.slice(-1)[0])) {
      thoughtLogs.shift()
    }

    if (_.isEqual(lexemeLogs[0], lexemeLog.slice(-1)[0])) {
      lexemeLogs.shift()
    }

    doc.transact(() => {
      if (thoughtLogs.length > 0) {
        thoughtLog.push(thoughtLogs)
      }
      if (lexemeLogs.length > 0) {
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
