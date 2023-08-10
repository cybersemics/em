import _ from 'lodash'
import { nanoid } from 'nanoid'
import * as Y from 'yjs'
import DocLogAction from '../../@types/DocLogAction'
import Index from '../../@types/IndexType'
import ReplicationCursor from '../../@types/ReplicationCursor'
import Storage from '../../@types/Storage'
import ThoughtId from '../../@types/ThoughtId'
import taskQueue from '../../util/taskQueue'
import { encodeDocLogBlockDocumentName, parseDocumentName } from './documentNameEncoder'

interface ReplicationResult {
  type: 'thought' | 'lexeme'
  id: ThoughtId | string
  // the delta index that is saved as the replication cursor to enable partial replication
  index: number
}

// TODO: Consolidate into constants without breaking worker bundle
const DOCLOG_BLOCK_SIZE = 10

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
    value: ReplicationResult
  }) => void
  /** Called whenever the doclog changes from a provider. May be called multiple times if the process is interrupted and the replication cursor is not updated. */
  next: ({ action }: { action: DocLogAction } & ReplicationResult) => Promise<void>
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
  const storeThoughtReplicationCursor = _.throttle(
    async (blockId: string, index: number) => {
      const replicationCursors = (await storage.getItem('replicationCursors')) || {}
      storage.setItem('replicationCursors', {
        ...replicationCursors,
        [blockId]: {
          ...(replicationCursors[blockId] || {
            thoughts: -1,
            lexemes: -1,
          }),
          thoughts: index,
        },
      })
    },
    1000,
    { leading: false },
  )

  /** Persist the persisted lexemeReplicationCursor (throttled). */
  const storeLexemeReplicationCursor = _.throttle(
    async (blockId: string, index: number) => {
      const replicationCursors = (await storage.getItem('replicationCursors')) || {}
      storage.setItem('replicationCursors', {
        ...replicationCursors,
        [blockId]: {
          ...(replicationCursors[blockId] || {
            thoughts: -1,
            lexemes: -1,
          }),
          lexemes: index,
        },
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
    storeThoughtReplicationCursor(blockId, index)
  }

  /** Updates the lexemeReplicationCursor immediately. Saves it to storage in the background (throttled). */
  const setLexemeReplicationCursor = (blockId: string, index: number) => {
    replicationCursors[blockId] = {
      thoughts: replicationCursors[blockId]?.thoughts ?? -1,
      lexemes: index,
    }
    storeLexemeReplicationCursor(blockId, index)
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
  const replicationQueue = taskQueue<ReplicationResult>({
    autostart,
    concurrency,
    onLowStep: async ({ index, value, total }) => {
      const activeBlock = await getActiveBlock()
      const blockId = getBlockKey(activeBlock)
      if (value.type === 'thought') {
        setThoughtReplicationCursor(blockId, value.index)
      } else {
        setLexemeReplicationCursor(blockId, value.index)
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
  const getActiveBlockCursors = async (
    // this will be faster if you already have the activeBlock
    activeBlock?: Y.Doc,
  ): Promise<{
    replicationCursors: ReplicationCursor
    observationCursors: ReplicationCursor
  }> => {
    activeBlock = activeBlock || (await getActiveBlock())
    if (!activeBlock)
      return {
        replicationCursors: { thoughts: -1, lexemes: -1 },
        observationCursors: { thoughts: -1, lexemes: -1 },
      }
    const blockId = getBlockKey(activeBlock)
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
        if (!activeBlock) return

        activeBlock.load()
        observeBlock(activeBlock)

        // TODO: Load any block that has not been fully replicated, i.e. block size > replicationCursors[blockId]
        // const blocks = doc.getArray('blocks')
        // const blockSizes = doc.getMap('blockSizes')
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
    // Clocks across clients are not monotonic, so we can't slice by clock.
    // Decoding updates gives an array of items, but the target (i.e. thoughtLog or lexemeLog) is not accessible.
    // Therefore, observe the deltas and slice from the replication cursor.
    thoughtLog.observe(async (e: Y.YArrayEvent<[ThoughtId, DocLogAction]>) => {
      // slice from the replication cursor (excluding thoughts that have already been sliced) in order to only replicate changed thoughts
      const activeBlock = await getActiveBlock()
      const blockId = getBlockKey(activeBlock)
      const activeBlockCursors = await getActiveBlockCursors(activeBlock)
      const { thoughts: thoughtReplicationCursor } = activeBlockCursors.replicationCursors
      const { thoughts: thoughtObservationCursor } = activeBlockCursors.observationCursors

      // since the doglogs are append-only, ids are only on .insert
      const deltasRaw: [ThoughtId, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      const deltas = deltasRaw.slice(thoughtReplicationCursor - thoughtObservationCursor)

      // thoughtObservationCursor is updated as soon as the deltas have been seen and the replication tasks are added to the queue
      // thoughtReplicationCursor is updated only on lowStep, when the replication completes.
      setThoughtObservationCursor(blockId, thoughtObservationCursor + deltasRaw.length)

      // If the change comes from self, do not trigger next, but update the replication cursor.
      // Otherwise, trigger next and the replication cursor will be updated on lowStep.
      if (e.transaction.origin === doc.clientID) {
        setThoughtReplicationCursor(blockId, thoughtReplicationCursor + deltas.length)
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
    })

    // See: thoughtLog.observe
    lexemeLog.observe(async (e: Y.YArrayEvent<[string, DocLogAction]>) => {
      const activeBlock = await getActiveBlock()
      const blockId = getBlockKey(activeBlock)
      const activeBlockCursors = await getActiveBlockCursors(activeBlock)
      const { lexemes: lexemeReplicationCursor } = activeBlockCursors.replicationCursors
      const { lexemes: lexemeObservationCursor } = activeBlockCursors.observationCursors

      // since the doglogs are append-only, ids are only on .insert
      const deltasRaw: [string, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      // slice from the replication cursor (excluding lexemes that have already been sliced) in order to only replicate changed lexemes
      // reverse the deltas so that we can mark lexemes as replicated from newest to oldest without an extra filter loop
      const deltas = deltasRaw.slice(lexemeReplicationCursor - lexemeObservationCursor)

      // thoughtObservationCursor is updated as soon as the deltas have been seen and the replication tasks are added to the queue
      // thoughtReplicationCursor is updated only on lowStep, when the replication completes.
      setLexemeObservationCursor(blockId, lexemeObservationCursor + deltasRaw.length)

      // If the change comes from self, do not trigger next, but update the replication cursor.
      // Otherwise, trigger next and the replication cursor will be updated on lowStep.
      if (e.transaction.origin === doc.clientID) {
        setLexemeReplicationCursor(blockId, lexemeReplicationCursor + deltas.length)
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
    if (activeBlock.getArray('thoughtLog').length >= DOCLOG_BLOCK_SIZE) {
      activeBlock = new Y.Doc({ guid: encodeDocLogBlockDocumentName(tsid, nanoid(13)) })
      // eslint-disable-next-line fp/no-mutating-methods
      doc.getArray('blocks').push([activeBlock])
    }

    const blockId = getBlockKey(activeBlock)

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

        // set the blockSize on the doclog so full blocks can be detected without loading them
        doc.getMap('blockSizes').set(blockId, thoughtLog.length)
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
