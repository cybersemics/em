import type { PayloadSchema, TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Lexeme from '../../@types/Lexeme'
import type ThoughtId from '../../@types/ThoughtId'
import hashThought from '../../util/hashThought'

const favoritesKey = hashThought('=favorite')

const payloadSchema: PayloadSchema = {
  id: 'em-thought',
  version: 1,
  setupSql: `
    ALTER TABLE tree_nodes ADD COLUMN value TEXT;
    ALTER TABLE tree_nodes ADD COLUMN created INTEGER;
    ALTER TABLE tree_nodes ADD COLUMN last_updated INTEGER;
    ALTER TABLE tree_nodes ADD COLUMN updated_by TEXT;
    ALTER TABLE tree_nodes ADD COLUMN archived INTEGER;
    ALTER TABLE tree_nodes ADD COLUMN value_hash BLOB;
    CREATE INDEX em_lexeme ON tree_nodes(value_hash, node) WHERE rooted = 1 AND tombstone = 0;
    CREATE TABLE em_favorites_order (id INTEGER PRIMARY KEY CHECK (id = 1), contexts TEXT NOT NULL);
  `,
  projectionSql: `
    UPDATE tree_nodes SET
      value = json_extract(CAST(?2 AS TEXT), '$.value'),
      created = json_extract(CAST(?2 AS TEXT), '$.created'),
      last_updated = json_extract(CAST(?2 AS TEXT), '$.lastUpdated'),
      updated_by = json_extract(CAST(?2 AS TEXT), '$.updatedBy'),
      archived = json_extract(CAST(?2 AS TEXT), '$.archived'),
      value_hash = unhex(json_extract(CAST(?2 AS TEXT), '$.valueHash'))
    WHERE node = ?1
  `,
}

const live = 'rooted = 1 AND tombstone = 0'
const pageSize = 512

type LexemeRow = Lexeme & { key: string; count: number }

/** Reads complete lexemes from the live occurrence index, in the requested key order. */
async function getLexemesByIds(client: TreecrdtClient, keys: string[]): Promise<(Lexeme | undefined)[]> {
  if (keys.length === 0) return []
  const requested = JSON.stringify([...new Set(keys)])
  // The cursor and all pages must describe one materialization, including a replay started by a remote append.
  await client.runner.run('SELECT treecrdt_ensure_materialized()')
  const result = await client.runner.getText(
    `WITH counts AS (
      SELECT value_hash, min(node) AS exemplar, count(*) AS count FROM tree_nodes
      WHERE ${live} AND value_hash IN (SELECT unhex(value) FROM json_each(?1)) GROUP BY value_hash
    )
    SELECT json_object('seq', (SELECT head_seq FROM tree_meta), 'favorites',
      (SELECT json(contexts) FROM em_favorites_order WHERE id = 1 AND ?2),
      'rows', json_group_array(json_object(
        'key', lower(hex(c.value_hash)), 'count', c.count, 'created', t.created,
        'lastUpdated', t.last_updated, 'updatedBy', t.updated_by,
        'contexts', (SELECT json_group_array(lower(hex(node))) FROM
          (SELECT node FROM tree_nodes WHERE ${live} AND value_hash = c.value_hash ORDER BY node LIMIT ${pageSize}))
      ))) FROM counts c JOIN tree_nodes t ON t.node = c.exemplar`,
    [requested, Number(keys.includes(favoritesKey))],
  )
  const { rows, seq, favorites } = JSON.parse(result!) as {
    rows: LexemeRow[]
    seq: number
    favorites: ThoughtId[] | null
  }

  let paged = false
  const lexemes = new Map<string, Lexeme>()
  for (const { key, count, contexts, ...metadata } of rows) {
    while (contexts.length < count) {
      paged = true
      const text = await client.runner.getText(
        `SELECT json_group_array(lower(hex(node))) FROM (
          SELECT node FROM tree_nodes WHERE ${live} AND value_hash = unhex(?1) AND node > unhex(?2)
          ORDER BY node LIMIT ${pageSize})`,
        [key, contexts[contexts.length - 1]],
      )
      const page = JSON.parse(text!) as ThoughtId[]
      if (page.length === 0) break
      contexts.push(...page)
    }
    if (key === favoritesKey && favorites) {
      const rank = new Map(favorites.map((id, i) => [id, i]))
      contexts.sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity))
    }
    lexemes.set(key, { ...metadata, contexts })
  }
  if (paged && Number(await client.runner.getText('SELECT head_seq FROM tree_meta')) !== seq) {
    return getLexemesByIds(client, keys)
  }
  return keys.map(key => lexemes.get(key))
}

export default { favoritesKey, getLexemesByIds, payloadSchema }
