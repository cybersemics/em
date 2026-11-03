import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import {
  applyAttributeChildren,
  clearAttributeChildren,
  refreshAttributeChildrenFromChanges,
} from './attributeChildren'
import createLexemeIndex, { payloadKeys } from './lexemes'

const INDEX_VERSION = 1
const PAGE_SIZE = 500

/**
 * Keeps em's derived SQLite indexes (attribute children and lexeme memberships) in step with one TreeCRDT client.
 *
 * Events are applied as they arrive, and the indexes store the headSeq they have reached. After a gap, such as
 * startup or a failed update, they read every node changed since that cursor with changedSince instead of
 * rebuilding. Without a cursor for this version, both indexes are cleared and every node is read.
 */
const createDerivedIndexes = async (client: TreecrdtClient) => {
  const lexemes = await createLexemeIndex(client)
  await client.runner.exec(`CREATE TABLE IF NOT EXISTS em_derived_indexes_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL, head_seq INTEGER NOT NULL
  )`)
  const stored = await client.runner.getText('SELECT head_seq FROM em_derived_indexes_meta WHERE version = ?1', [
    INDEX_VERSION,
  ])
  let cursor = stored === null ? 0 : Number(stored)
  if (stored === null) {
    await lexemes.clear()
    await clearAttributeChildren(client)
  }

  /** Saves how far both indexes have read. Applying a node twice is harmless, so this is written after the rows. */
  const advance = async (headSeq: number) => {
    if (headSeq <= cursor) return
    cursor = headSeq
    await client.runner.getText(
      'INSERT OR REPLACE INTO em_derived_indexes_meta (id, version, head_seq) VALUES (1, ?1, ?2)',
      [INDEX_VERSION, headSeq],
    )
  }

  /** Applies every node changed after the cursor, then advances it; resolves with the affected lexeme keys. */
  const catchUp = async (): Promise<string[]> => {
    const keys = new Set<string>()
    let page = await client.tree.changedSince(cursor, { payloads: true, limit: PAGE_SIZE })
    for (;;) {
      for (const key of await lexemes.applyNodes(page.nodes)) keys.add(key)
      await applyAttributeChildren(client, page.nodes)
      if (!page.next) break
      page = await client.tree.changedSince(page.next, { payloads: true, limit: PAGE_SIZE })
    }
    await advance(page.headSeq)
    return [...keys]
  }

  await catchUp()
  let stale = false
  let indexQueue = Promise.resolve()

  /** Applies one event, or catches up from the cursor after a failed update. */
  const apply = async (event: MaterializationEvent): Promise<string[]> => {
    if (stale) {
      const keys = await catchUp()
      stale = false
      return [...new Set([...payloadKeys(event.changes), ...keys])]
    }
    // A catch-up may already have read this event's changes.
    if (event.headSeq <= cursor) return payloadKeys(event.changes)
    await refreshAttributeChildrenFromChanges(client, event.changes)
    const keys = await lexemes.applyChanges(event.changes)
    await advance(event.headSeq)
    return keys
  }

  /** Queues an event's index update; resolves with the lexeme keys it affected. */
  const updateIndexes = (event: MaterializationEvent): Promise<string[]> => {
    const keys = indexQueue.then(() => apply(event))
    // A failure leaves the cursor in place, so the next event catches up and retries the same changes.
    indexQueue = keys.then(
      () => undefined,
      err => {
        stale = true
        console.error('TreeCRDT derived indexing failed', err)
      },
    )
    // Publication still needs this event's thoughts; the catch-up reports the memberships it missed.
    return keys.catch(() => payloadKeys(event.changes))
  }

  /** Waits for all queued updates, including ones queued while waiting. */
  const waitForIndexes = async () => {
    let pending: Promise<void>
    do {
      pending = indexQueue
      await pending
    } while (pending !== indexQueue)
  }

  return { lexemes, updateIndexes, waitForIndexes }
}

export default createDerivedIndexes
