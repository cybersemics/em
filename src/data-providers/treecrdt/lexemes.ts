import type { Change } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Lexeme from '../../@types/Lexeme'
import type ThoughtId from '../../@types/ThoughtId'
import type Timestamp from '../../@types/Timestamp'
import { GLOBAL_ROOT_TOKEN } from '../../constants'
import hashThought from '../../util/hashThought'
import { decodeThoughtPayload } from './payload'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'

const TABLE = 'em_lexeme_memberships'
const FAVORITE_KEY = hashThought('=favorite')
const ROOT_IDS = new Set<string>([GLOBAL_ROOT_TOKEN, ...SYSTEM_ROOT_THOUGHT_IDS])

/** Hashes of the values a change batch carried. A later write may have replaced one in storage while Redux still shows it. */
export const payloadKeys = (changes: readonly Change[]): string[] =>
  changes.flatMap(change =>
    !ROOT_IDS.has(change.node) && 'payload' in change && change.payload
      ? [hashThought(decodeThoughtPayload(change.payload).value)]
      : [],
  )

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
    CREATE TABLE IF NOT EXISTS em_favorite_order (
      id INTEGER PRIMARY KEY CHECK (id = 1), contexts_json TEXT NOT NULL
    );
  `)

  /** Saves explicit ordering intent separately from membership updates, which must not prune it. */
  const setFavoriteOrder = (contexts: ThoughtId[]) =>
    client.runner.run('INSERT OR REPLACE INTO em_favorite_order (id, contexts_json) VALUES (1, ?1)', [
      JSON.stringify(contexts),
    ])

  /** Updates memberships from one event's changes and returns the affected hashes. Moves change no membership. */
  const applyChanges = async (changes: readonly Change[]): Promise<string[]> => {
    // Keep each thought's last value, or null once it is gone: one event can carry several changes for one thought.
    const latest = new Map<string, Uint8Array | null>()
    for (const change of changes) {
      if (change.kind !== 'move' && !ROOT_IDS.has(change.node)) {
        latest.set(change.node, change.kind === 'delete' ? null : change.payload)
      }
    }
    if (latest.size === 0) return []
    // The hashes these thoughts are listed under now, which lose them if the value changed or the thought is gone.
    const before = JSON.parse(
      (await client.runner.getText(
        `SELECT json_group_array(lexeme_hash) FROM ${TABLE} WHERE thought_id IN (SELECT value FROM json_each(?1))`,
        [JSON.stringify([...latest.keys()])],
      ))!,
    ) as string[]
    const gone = [...latest.keys()].filter(id => !latest.get(id))
    const rows = [...latest].flatMap(([id, payload]) => {
      if (!payload) return []
      const { value, created, lastUpdated, updatedBy } = decodeThoughtPayload(payload)
      return [[id, hashThought(value), created, lastUpdated, updatedBy]]
    })
    if (gone.length > 0) {
      await client.runner.run(`DELETE FROM ${TABLE} WHERE thought_id IN (SELECT value FROM json_each(?1))`, [
        JSON.stringify(gone),
      ])
    }
    if (rows.length > 0) {
      await client.runner.run(
        `INSERT OR REPLACE INTO ${TABLE} (thought_id, lexeme_hash, created, last_updated, updated_by)
         SELECT value->>0, value->>1, value->>2, value->>3, value->>4 FROM json_each(?1)`,
        [JSON.stringify(rows)],
      )
    }
    // payloadKeys adds the new hashes, and any value in between that Redux may still show.
    return [...new Set([...before, ...payloadKeys(changes)])]
  }

  /** Removes every membership before a full read rebuilds them. */
  const clear = () => client.runner.exec(`DELETE FROM ${TABLE}`)

  /** Assembles Lexemes from memberships, preserving requested key order. */
  const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> => {
    if (keys.length === 0) return []
    const text = await client.runner.getText(
      `SELECT json_group_array(json_object('id', thought_id, 'key', lexeme_hash,
        'created', created, 'lastUpdated', last_updated, 'updatedBy', updated_by) ORDER BY created, thought_id)
       FROM ${TABLE} WHERE lexeme_hash IN (SELECT value FROM json_each(?1))`,
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
    for (const { id, key, created, lastUpdated, updatedBy } of rows) {
      const lexeme = lexemes.get(key)
      if (!lexeme) {
        lexemes.set(key, { contexts: [id], created, lastUpdated, updatedBy })
      } else {
        lexeme.contexts.push(id)
        if (lastUpdated >= lexeme.lastUpdated) {
          lexeme.lastUpdated = lastUpdated
          lexeme.updatedBy = updatedBy
        }
      }
    }
    const favorites = lexemes.get(FAVORITE_KEY)
    if (favorites) {
      const text = await client.runner.getText('SELECT contexts_json FROM em_favorite_order WHERE id = 1')
      const order = new Set(JSON.parse(text ?? '[]') as ThoughtId[])
      const members = new Set(favorites.contexts)
      favorites.contexts = [
        ...[...order].filter(id => members.has(id)),
        ...favorites.contexts.filter(id => !order.has(id)),
      ]
    }
    return keys.map(key => lexemes.get(key))
  }

  return { applyChanges, clear, setFavoriteOrder, getLexemesByIds }
}

export default createLexemeIndex
