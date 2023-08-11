import _ from 'lodash'
import { nanoid } from 'nanoid'
import * as Y from 'yjs'
import DocLogAction from '../../@types/DocLogAction'
import Index from '../../@types/IndexType'
import ReplicationCursor from '../../@types/ReplicationCursor'
import Storage from '../../@types/Storage'
import ThoughtId from '../../@types/ThoughtId'
import keyValueBy from '../../util/keyValueBy'
import taskQueue from '../../util/taskQueue'
import throttleConcat from '../../util/throttleConcat'
import { encodeDocLogBlockDocumentName, parseDocumentName } from './documentNameEncoder'

/** Represents replication of a single Thought or Lexeme. Passed to the next callback, and used internally to update the replication cursors. */
interface ReplicationTask {
  type: 'thought' | 'lexeme'
  id: ThoughtId | string
  /* the delta index that is saved as the replication cursor to enable partial replication */
  index: number
  /* doclog block where this object was replicated */
  block: Y.Doc
}

/** Max number of thoughts per doclog block. When the limit is reached, a new block (subdoc) is created to take updates. Only the active block needs to be loaded into memory. */
const DOCLOG_BLOCK_SIZE = 100

/** Delay before filled block is unloaded. This allows straggler updates to be observed if other devices have not switched over to the new block yet. After the delay, it is still possible for new updates be added to the block (by offline devices), but that is handled separately by observing blockSizes and re-loading the overfilled block to replicate when its blockSize changes. */
// const DOCLOG_BLOCK_UNLOAD_DELAY = 5000

/** A replication controller that ensures that thought and lexeme updates are efficiently and reliably replicated. Does not dictate the replication method itself, but rather maintains a replication queue for throttled concurrency and a replication cursor for resumability. On load, triggers a replicaton for all thoughts and lexemes that have not been processed (via next). When a new update is received (via log), calls next to process the update. Provides start and pause for full control over when replication is running. */
const replicationController = ({
  autostart = true,
  concurrency = 8,
  // replicationController will wait for first subdoc before observing doclog
  doc,
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

  // load thoughtReplicationCursor and lexemeReplicationCursor into memory
  const replicationCursorsInitialized = Promise.all([
    Promise.resolve(storage.getItem('replicationCursors')).then(value => {
      if (value == null) return
      replicationCursors = value
    }),
  ])

  /** Persist the thought replication cursor (throttled). */
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
    1000,
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
    1000,
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
    autostart,
    concurrency,
    onLowStep: async ({ value: { block, index, type } }) => {
      const blockId = getBlockKey(block)
      const blockSize = block.getArray('thoughtLog').length

      if (type === 'thought') {
        setThoughtReplicationCursor(blockId, index)
      } else {
        setLexemeReplicationCursor(blockId, index)
      }

      // set the blockSize so that full blocks can be detected and not loaded on startup
      // only update blockSize after replication to ensure that the block is re-loaded if interrupted by a refresh
      if (blockSize >= DOCLOG_BLOCK_SIZE) {
        const blockSizeOld = doc.getMap('blockSizes').get(blockId)
        if (!blockSizeOld || blockSize > blockSizeOld) {
          doc.getMap('blockSizes').set(blockId, blockSize)
        }
      }
    },
    onStep,
    onEnd,
    retries: 4,
    timeout: 10000,
  })

  /** A promise that resolves when the first doclog subdoc is added and a block is available for logging. The first block is created on doclogPersistence.whenSynced in thoughtspace.init. */
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

  /** Gets the active doclog block where new thought and lexeme updates should be logged. This will typically be the last block, except in the case where multiple new blocks were created on different devices at the same time. In that case it will be the first unfilled block. Previous blocks are not loaded into memory. */
  const getActiveBlock = async (): Promise<Y.Doc> => {
    await replicationCursorsInitialized
    await subdocsAdded

    const blocks: Y.Doc[] = doc.getArray('blocks').toArray()

    // Find the first unfilled block.
    // It will usually be the last block, unless two devices create a new block at the same time. In that case, the blocks array will converage and both devices will fill up the first unfilled block before moving to the next.
    const activeBlock = blocks.find(block => {
      const { blockId } = parseDocumentName(block.guid)
      return (doc.getMap('blockSizes').get(blockId) || 0) < DOCLOG_BLOCK_SIZE
    })

    // If there is no unfilled block, return the last block.
    // Only log() should create a new block, otherwise it can cause an infinite loop.
    return activeBlock || blocks[blocks.length - 1]
  }

  /** Extracts the blockId of the given doclog block from its guid. If no block is provided, gets the active block's blockId. */
  const getBlockKey = (block: Y.Doc): string =>
    // blockId must be defined since doclog subdocs always have a guid in the format /TSID/doclog/block/BLOCK_ID
    parseDocumentName(block.guid).blockId!

  /** Gets the replication cursors and observation cursors for the active doclog block. */
  const getBlockCursors = async (
    block: Y.Doc,
  ): Promise<{
    replicationCursors: ReplicationCursor
    observationCursors: ReplicationCursor
  }> => {
    const blockId = getBlockKey(block)
    return {
      replicationCursors: replicationCursors[blockId] || { thoughts: -1, lexemes: -1 },
      observationCursors: observationCursors[blockId] || { thoughts: -1, lexemes: -1 },
    }
  }

  // TODO: Type Y.Arrays once doc is properly typed as Y.Doc
  // const thoughtLog = doc.getArray<[ThoughtId, DocLogAction]>('thoughtLog')
  // const lexemeLog = doc.getArray<[string, DocLogAction]>('lexemeLog')
  doc.on(
    'subdocs',
    async ({ added, removed, loaded }: { added: Set<Y.Doc>; removed: Set<Y.Doc>; loaded: Set<Y.Doc> }) => {
      // load and observe the active block when there are new subdocs
      if (added.size > 0) {
        const activeBlock = await getActiveBlock()
        const activeBlockId = getBlockKey(activeBlock)

        activeBlock.load()
        observeBlock(activeBlock)

        // load, replicate, and subscribe to unreplicated or unfilled blocks
        doc.getArray('blocks').forEach((block: Y.Doc) => {
          const blockId = getBlockKey(block)
          if (blockId === activeBlockId) return
          const blockSize = doc.getMap('blockSizes').get(blockId)
          const thoughtReplicationCursor = replicationCursors[blockId]?.thoughts ?? -1
          if (!thoughtReplicationCursor || thoughtReplicationCursor < blockSize - 1) {
            block.load()
            observeBlock(block)
          }
        })
      }
    },
  )

  /** Observes the thoughtLog and lexemeLog of the given block to replicate changes from remote devices. */
  const observeBlock = async (block: Y.Doc) => {
    // wait until the replication cursors have been initialized to ensure that only the changed slice of deltas is replicated
    await replicationCursorsInitialized

    // since storage is async, we need to wait for the replication cursor to be initialized before observing doclog updates
    const thoughtLog = block.getArray<[ThoughtId, DocLogAction]>('thoughtLog')
    const lexemeLog = block.getArray<[string, DocLogAction]>('lexemeLog')

    // Partial replication uses the doclog to avoid replicating the same thought or lexeme in the background on load.
    // Observe the deltas and slice from the replication cursor. (Why not slice directly from thoughtLog instead of the deltas???)
    // Also, note that we need to observe self updates as well, since local changes still need to get replicated to the remote. The replication cursors must only be updated via onLowStep to ensure that the changes have been synced with the websocket.
    thoughtLog.observe(async (e: Y.YArrayEvent<[ThoughtId, DocLogAction]>) => {
      // Must go before await statement as e.changes is a dynamic property that must be accessed synchronously.
      const deltasRaw: [ThoughtId, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      const blockId = getBlockKey(block)
      const blockCursors = await getBlockCursors(block)
      const { thoughts: thoughtReplicationCursor } = blockCursors.replicationCursors
      const { thoughts: thoughtObservationCursor } = blockCursors.observationCursors

      // slice from the replication cursor in order to only replicate changed thoughts
      const deltas = deltasRaw.slice(thoughtReplicationCursor - thoughtObservationCursor)

      // thoughtObservationCursor is updated as soon as the deltas have been seen and the replication tasks are added to the queue
      // thoughtReplicationCursor is updated only on lowStep, when the replication completes.
      setThoughtObservationCursor(blockId, thoughtObservationCursor + deltasRaw.length)

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
        return async (): Promise<ReplicationTask> => {
          const taskData: ReplicationTask = { type: 'thought', id, block, index: startIndex + i + 1 }
          await next({ ...taskData, action })
          return taskData
        }
      })

      // replicate changed thoughts
      replicationQueue.add(tasks)

      // TODO:
      // unload if block is full and replicated
      // console.warn('Initiating unload block', { blockId: getBlockKey(block), blockSize })
      // setTimeout(() => {
      //   // the block will automatically be re-added by the provider and trigger the subdocs event, but the subdocs listener will detect that the block is full and not load it
      //   block.destroy()
      //   console.warn('Block destroyed', getBlockKey(block))
      // }, DOCLOG_BLOCK_UNLOAD_DELAY) as unknown as number
    })

    // See: thoughtLog.observe
    lexemeLog.observe(async (e: Y.YArrayEvent<[string, DocLogAction]>) => {
      // Must go before await statement as e.changes is a dynamic property that must be accessed synchronously.
      const deltasRaw: [string, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      const blockId = getBlockKey(block)
      const blockCursors = await getBlockCursors(block)
      const { lexemes: lexemeReplicationCursor } = blockCursors.replicationCursors
      const { lexemes: lexemeObservationCursor } = blockCursors.observationCursors

      // slice from the replication cursor in order to only replicate changed lexemes
      const deltas = deltasRaw.slice(lexemeReplicationCursor - lexemeObservationCursor)

      // thoughtObservationCursor is updated as soon as the deltas have been seen and the replication tasks are added to the queue
      // thoughtReplicationCursor is updated only on lowStep, when the replication completes.
      setLexemeObservationCursor(blockId, lexemeObservationCursor + deltasRaw.length)

      // generate a map of Lexeme keys with their last updated index so that we can ignore older updates to the same lexeme
      const replicated = new Map<string, number>()
      deltas.forEach(([key], i) => replicated.set(key, i))

      // Get closure over thoughtReplicationCursor so that the ReplicationResult index is correct.
      // Otherwise thoughtReplicationCursor may increase before the task completes.
      const startIndex = lexemeReplicationCursor

      const tasks = deltas.map(([key, action], i) => {
        // ignore older updates to the same lexeme
        if (i !== replicated.get(key)) return null

        // trigger next (i.e. replicate the thought)
        return async (): Promise<ReplicationTask> => {
          const result: ReplicationTask = { type: 'lexeme', block, id: key, index: startIndex + i + 1 }
          await next({ ...result, action })
          return result
        }
      })

      replicationQueue.add(tasks)
    })
  }

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

    let activeBlock = await getActiveBlock()

    // if the block is full, create a new block
    // TODO: Should we destroy the old block to clean up memory? Or keep it around in case another devices pushes to it?
    if (activeBlock.getArray('thoughtLog').length >= DOCLOG_BLOCK_SIZE) {
      activeBlock = new Y.Doc({ guid: encodeDocLogBlockDocumentName(tsid, nanoid(13)) })
      // eslint-disable-next-line fp/no-mutating-methods
      doc.getArray('blocks').push([activeBlock])
    }

    const thoughtLog = activeBlock.getArray<[string, DocLogAction]>('thoughtLog')
    const lexemeLog = activeBlock.getArray<[string, DocLogAction]>('lexemeLog')

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
