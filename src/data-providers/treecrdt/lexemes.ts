import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Lexeme from '../../@types/Lexeme'
import type ThoughtId from '../../@types/ThoughtId'
import type Timestamp from '../../@types/Timestamp'
import { GLOBAL_ROOT_TOKEN } from '../../constants'
import hashThought from '../../util/hashThought'
import { decodeThoughtPayload } from './payload'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'

const TABLE = 'em_lexeme_memberships'
const META_TABLE = 'em_lexeme_memberships_meta'
const ROOT_IDS = new Set<string>([GLOBAL_ROOT_TOKEN, ...SYSTEM_ROOT_THOUGHT_IDS])

/** Maintains one membership per live thought, independent of which contexts Redux has loaded. */
const createLexemeIndex = async (client: TreecrdtClient) => {
  await client.runner.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      thought_id TEXT PRIMARY KEY NOT NULL,
      lexeme_hash TEXT NOT NULL,
      created INTEGER NOT NULL,
      last_updated INTEGER NOT NULL,
      updated_by TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_${TABLE}_hash ON ${TABLE} (lexeme_hash);
    CREATE TABLE IF NOT EXISTS ${META_TABLE} (id INTEGER PRIMARY KEY CHECK (id = 1), head_seq INTEGER NOT NULL);
  `)
  let pending = Promise.resolve()

  /** Replaces a thought's membership from current materialized state, returning both affected hashes. */
  const reindex = async (id: ThoughtId): Promise<string[]> => {
    if (ROOT_IDS.has(id)) return []
    const previous = await client.runner.getText(`SELECT lexeme_hash FROM ${TABLE} WHERE thought_id = ?1`, [id])
    const payloadBytes = (await client.tree.exists(id)) ? await client.tree.getPayload(id) : null
    if (!payloadBytes) {
      await client.runner.getText(`DELETE FROM ${TABLE} WHERE thought_id = ?1`, [id])
      return previous ? [previous] : []
    }
    const payload = decodeThoughtPayload(payloadBytes)
    const key = hashThought(payload.value)
    // getText also executes parameterized writes (returning null); exec does not accept bind parameters.
    await client.runner.getText(
      `INSERT INTO ${TABLE} (thought_id, lexeme_hash, created, last_updated, updated_by) VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(thought_id) DO UPDATE SET lexeme_hash = excluded.lexeme_hash, created = excluded.created,
         last_updated = excluded.last_updated, updated_by = excluded.updated_by`,
      [id, key, payload.created, payload.lastUpdated, payload.updatedBy],
    )
    return previous && previous !== key ? [previous, key] : [key]
  }

  /** Records only a frontier whose membership writes have all completed. */
  const checkpoint = async (headSeq: number): Promise<void> => {
    await client.runner.getText(`INSERT OR REPLACE INTO ${META_TABLE} (id, head_seq) VALUES (1, ?1)`, [headSeq])
  }

  // The frontier detects a crash between a CRDT write and its derived-index update.
  const outcome = JSON.parse((await client.runner.getText('SELECT treecrdt_ensure_materialized()'))!) as {
    headSeq: number
  }
  const indexedHead = await client.runner.getText(`SELECT head_seq FROM ${META_TABLE} WHERE id = 1`)
  if (indexedHead === null || Number(indexedHead) !== outcome.headSeq) {
    await client.runner.exec(`DELETE FROM ${META_TABLE}; DELETE FROM ${TABLE}`)
    for (const row of await client.tree.dump()) {
      if (!row.tombstone) await reindex(row.node as ThoughtId)
    }
    await checkpoint(outcome.headSeq)
  }

  /** Queues index writes independently of UI refreshes, which may wait for local persistence. */
  const applyChanges = (event: MaterializationEvent): Promise<string[]> => {
    const update = pending.then(async () => {
      const keys = new Set<string>()
      // A subsequent write may already have superseded this value in storage, but Redux may still display it.
      for (const change of event.changes) {
        if (!ROOT_IDS.has(change.node) && 'payload' in change && change.payload) {
          keys.add(hashThought(decodeThoughtPayload(change.payload).value))
        }
      }
      for (const id of new Set(event.changes.map(change => change.node as ThoughtId))) {
        for (const key of await reindex(id)) keys.add(key)
      }
      await checkpoint(event.headSeq)
      return [...keys]
    })
    pending = update.then(() => undefined)
    // Keep failures sticky: later events must not checkpoint over a failed index update.
    void pending.catch(() => undefined)
    return update
  }

  /** Waits for every queued index write, including events received while waiting. */
  const waitForIdle = async (): Promise<void> => {
    let observed: Promise<void>
    do {
      observed = pending
      await observed
    } while (observed !== pending)
  }

  /** Assembles Lexemes from memberships, preserving requested key order. */
  const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> => {
    await waitForIdle()
    if (keys.length === 0) return []
    const text = await client.runner.getText(
      `SELECT json_group_array(json_object('id', thought_id, 'key', lexeme_hash,
        'created', created, 'lastUpdated', last_updated, 'updatedBy', updated_by))
       FROM (SELECT * FROM ${TABLE} WHERE lexeme_hash IN (SELECT value FROM json_each(?1))
         ORDER BY created, thought_id)`,
      [JSON.stringify(keys)],
    )
    const rows = JSON.parse(text!) as {
      id: ThoughtId
      key: string
      created: Timestamp
      lastUpdated: Timestamp
      updatedBy: string
    }[]
    const lexemes = new Map<string, Lexeme>()
    for (const row of rows) {
      const lexeme = lexemes.get(row.key)
      if (!lexeme) {
        lexemes.set(row.key, {
          contexts: [row.id],
          created: row.created,
          lastUpdated: row.lastUpdated,
          updatedBy: row.updatedBy,
        })
      } else {
        lexeme.contexts.push(row.id)
        if (row.lastUpdated >= lexeme.lastUpdated) {
          lexeme.lastUpdated = row.lastUpdated
          lexeme.updatedBy = row.updatedBy
        }
      }
    }
    return keys.map(key => lexemes.get(key))
  }

  return {
    applyChanges,
    getLexemesByIds,
    getLexemeById: async (key: string) => (await getLexemesByIds([key]))[0],
    waitForIdle,
  }
}

export default createLexemeIndex
