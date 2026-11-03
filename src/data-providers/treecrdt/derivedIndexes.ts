import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import {
  applyAttributeChildren,
  clearAttributeChildren,
  refreshAttributeChildrenFromChanges,
} from './attributeChildren'

const INDEX_VERSION = 1
const PAGE_SIZE = 500

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
  if (stored === null) await clearAttributeChildren(client)

  /** Saves how far the indexes have read. Applying a node twice is harmless, so this is written after the rows. */
  const advance = async (headSeq: number) => {
    if (headSeq <= cursor) return
    cursor = headSeq
    await client.runner.getText(
      'INSERT OR REPLACE INTO em_derived_indexes_meta (id, version, head_seq) VALUES (1, ?1, ?2)',
      [INDEX_VERSION, headSeq],
    )
  }

  /** Applies every node changed after the cursor, then advances it. */
  const catchUp = async (): Promise<void> => {
    let page = await client.tree.changedSince(cursor, { payloads: true, limit: PAGE_SIZE })
    for (;;) {
      await applyAttributeChildren(client, page.nodes)
      if (!page.next) break
      page = await client.tree.changedSince(page.next, { payloads: true, limit: PAGE_SIZE })
    }
    await advance(page.headSeq)
  }

  await catchUp()
  let stale = false
  let indexQueue = Promise.resolve()

  /** Applies one event, or catches up from the cursor after a failed update. */
  const apply = async (event: MaterializationEvent): Promise<void> => {
    if (stale) {
      await catchUp()
      stale = false
      return
    }
    // A catch-up may already have read this event's changes.
    if (event.headSeq <= cursor) return
    await refreshAttributeChildrenFromChanges(client, event.changes)
    await advance(event.headSeq)
  }

  /** Queues an event's index update. */
  const updateIndexes = (event: MaterializationEvent): void => {
    // A failure leaves the cursor in place, so the next event catches up and retries the same changes.
    indexQueue = indexQueue
      .then(() => apply(event))
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

  return { updateIndexes, waitForIndexes }
}

export default createDerivedIndexes
