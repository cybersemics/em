import type { Change, TreecrdtChangedNode } from '@treecrdt/interface/engine'
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

/** The node state a membership depends on, from a changedSince page or a materialization change. */
type MembershipNode = Pick<TreecrdtChangedNode, 'node' | 'tombstone' | 'payload'>

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
    client.runner.getText('INSERT OR REPLACE INTO em_favorite_order (id, contexts_json) VALUES (1, ?1)', [
      JSON.stringify(contexts),
    ])

  /** Replaces the memberships of changed nodes from their current state, returning every affected hash. */
  const applyNodes = async (nodes: readonly MembershipNode[]): Promise<string[]> => {
    // Keep each node's last state: one event can carry several changes for the same node.
    const latest = new Map<string, MembershipNode>()
    for (const node of nodes) if (!ROOT_IDS.has(node.node)) latest.set(node.node, node)
    if (latest.size === 0) return []
    const previous = JSON.parse(
      (await client.runner.getText(
        `SELECT json_group_object(thought_id, json_array(lexeme_hash, created, last_updated, updated_by)) FROM ${TABLE}
         WHERE thought_id IN (SELECT value FROM json_each(?1))`,
        [JSON.stringify([...latest.keys()])],
      )) ?? '{}',
    ) as Record<string, [string, number, number, string]>
    const keys = new Set<string>()
    const gone: string[] = []
    const live: [string, string, number, number, string][] = []
    for (const node of latest.values()) {
      const before = previous[node.node]
      if (node.tombstone || !node.payload) {
        if (!before) continue
        keys.add(before[0])
        gone.push(node.node)
        continue
      }
      const payload = decodeThoughtPayload(node.payload)
      const row: [string, string, number, number, string] = [
        node.node,
        hashThought(payload.value),
        payload.created,
        payload.lastUpdated,
        payload.updatedBy,
      ]
      // Skip rows that already match, such as a node whose payload did not change.
      if (before && before.every((value, i) => value === row[i + 1])) continue
      if (before) keys.add(before[0])
      keys.add(row[1])
      live.push(row)
    }
    // getText also executes parameterized writes (returning null); exec does not accept bind parameters.
    if (gone.length > 0) {
      await client.runner.getText(`DELETE FROM ${TABLE} WHERE thought_id IN (SELECT value FROM json_each(?1))`, [
        JSON.stringify(gone),
      ])
    }
    if (live.length > 0) {
      await client.runner.getText(
        `INSERT INTO ${TABLE} (thought_id, lexeme_hash, created, last_updated, updated_by)
         SELECT value->>0, value->>1, value->>2, value->>3, value->>4 FROM json_each(?1) WHERE true
         ON CONFLICT(thought_id) DO UPDATE SET lexeme_hash = excluded.lexeme_hash, created = excluded.created,
           last_updated = excluded.last_updated, updated_by = excluded.updated_by`,
        [JSON.stringify(live)],
      )
    }
    return [...keys]
  }

  /** Updates memberships from one event's changes and returns the affected hashes. Moves change no membership. */
  const applyChanges = async (changes: readonly Change[]): Promise<string[]> => {
    const nodes = changes.flatMap(change =>
      change.kind === 'move'
        ? []
        : [
            {
              node: change.node,
              tombstone: change.kind === 'delete',
              payload: 'payload' in change ? change.payload : null,
            },
          ],
    )
    return [...new Set([...payloadKeys(changes), ...(await applyNodes(nodes))])]
  }

  /** Removes every membership before a full read rebuilds them. */
  const clear = () => client.runner.exec(`DELETE FROM ${TABLE}`)

  /** Assembles Lexemes from memberships, preserving requested key order. */
  const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> => {
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
