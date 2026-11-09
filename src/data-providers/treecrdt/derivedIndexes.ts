import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import {
  applyAttributeChildren,
  clearAttributeChildren,
  refreshAttributeChildrenFromChanges,
} from './attributeChildren'

const INDEX_VERSION = 1
const PAGE_SIZE = 500
/** How long index updates must pause before the cursor row is written. Longer than EDIT_THROTTLE, so typing writes it once. */
const CURSOR_SAVE_DELAY_MS = 2000

/**
 * Keeps em's derived SQLite indexes (attribute children) in step with one TreeCRDT client.
 *
 * Events are applied as they arrive, and the indexes store the headSeq they have reached. After a gap, such as
 * startup or a failed update, they read every node changed since that cursor with changedSince instead of
 * rebuilding. Without a cursor for this version, the index is cleared and every node is read.
 */
const createDerivedIndexes = async (client: TreecrdtClient) => {
  await client.runner.exec(`CREATE TABLE IF NOT EXISTS em_derived_indexes_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL, head_seq INTEGER NOT NULL
  )`)
  const stored = await client.runner.getText('SELECT head_seq FROM em_derived_indexes_meta WHERE version = ?1', [
    INDEX_VERSION,
  ])
  let cursor = stored === null ? 0 : Number(stored)
  let savedCursor = cursor
  if (stored === null) await clearAttributeChildren(client)
  let stale = false
  let indexQueue = Promise.resolve()
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  /** Writes the cursor row if the cursor moved since the last write. */
  const saveCursor = async () => {
    if (cursor === savedCursor) return
    const headSeq = cursor
    await client.runner.getText(
      'INSERT OR REPLACE INTO em_derived_indexes_meta (id, version, head_seq) VALUES (1, ?1, ?2)',
      [INDEX_VERSION, headSeq],
    )
    savedCursor = headSeq
  }

  /** Applies every node changed after the cursor, then saves it. */
  const catchUp = async (): Promise<void> => {
    let page = await client.tree.changedSince(cursor, { payloads: true, limit: PAGE_SIZE })
    for (;;) {
      await applyAttributeChildren(client, page.nodes)
      if (!page.next) break
      page = await client.tree.changedSince(page.next, { payloads: true, limit: PAGE_SIZE })
    }
    cursor = page.headSeq
    // A catch-up can cover many nodes, so its cursor is written right away.
    await saveCursor()
  }

  await catchUp()

  /** Queues an event's index update, or a catch-up from the cursor after a failed update. */
  const updateIndexes = (event: MaterializationEvent): void => {
    indexQueue = indexQueue
      .then(async () => {
        if (stale) {
          await catchUp()
          stale = false
          return
        }
        // A catch-up may already have read this event's changes.
        if (event.headSeq <= cursor) return
        await refreshAttributeChildrenFromChanges(client, event.changes)
        cursor = event.headSeq
        // Writing the row once updates pause saves a commit per event. It may lag behind the index, which only means
        // the next catch-up re-applies a few nodes, but it is never written ahead of the rows it covers.
        clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          indexQueue = indexQueue.then(saveCursor).catch(err => console.error('TreeCRDT derived indexing failed', err))
        }, CURSOR_SAVE_DELAY_MS)
      })
      // A failure leaves the cursor in place, so the next event catches up and retries the same changes.
      .catch(err => {
        stale = true
        console.error('TreeCRDT derived indexing failed', err)
      })
  }

  /** Waits for all queued updates, including ones queued while waiting. */
  const waitForIndexes = async () => {
    let pending: Promise<void>
    do {
      pending = indexQueue
      await pending
    } while (pending !== indexQueue)
  }

  /** Drains the queue and writes the cursor, so a clean shutdown leaves nothing to re-read. */
  const close = async () => {
    await waitForIndexes()
    clearTimeout(saveTimer)
    await saveCursor()
  }

  return { updateIndexes, waitForIndexes, close }
}

export default createDerivedIndexes
