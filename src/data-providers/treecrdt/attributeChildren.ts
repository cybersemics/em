/* eslint-disable import/prefer-default-export */
import type { Change } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Index from '../../@types/IndexType'
import type ThoughtId from '../../@types/ThoughtId'
import isAttribute from '../../util/isAttribute'
import { decodeThoughtPayload } from './payload'

/** Application-owned child value index used to restore em's attribute-keyed childrenMap contract. */
const TABLE = 'em_attribute_children'
const schemaReady = new WeakSet<TreecrdtClient>()

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  child_id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT NOT NULL,
  value TEXT NOT NULL
);`

const CREATE_PARENT_INDEX_SQL = `CREATE INDEX IF NOT EXISTS idx_${TABLE}_parent ON ${TABLE} (parent_id);`

/** Ensures the derived attribute-child index schema exists. */
async function ensureAttributeChildrenSchema(client: TreecrdtClient): Promise<void> {
  if (schemaReady.has(client)) return
  await client.runner.exec(CREATE_TABLE_SQL)
  await client.runner.exec(CREATE_PARENT_INDEX_SQL)
  schemaReady.add(client)
}

/** Returns the indexed attribute values for a parent's direct children, keyed by child id. */
export async function getAttributeChildrenByParent(
  client: TreecrdtClient,
  parentId: ThoughtId,
): Promise<Index<string>> {
  await ensureAttributeChildrenSchema(client)
  const text = await client.runner.getText(
    `SELECT json_group_array(json_object('childId', child_id, 'value', value)) FROM ${TABLE} WHERE parent_id = ?1`,
    [parentId],
  )
  if (!text) return {}

  const rows = JSON.parse(text) as ({ childId: ThoughtId; value: string } | null)[]
  const valueByChildId: Index<string> = {}
  for (const row of rows) {
    if (row?.childId && row.value) valueByChildId[row.childId] = row.value
  }
  return valueByChildId
}

/** Removes every row before a full read rebuilds the index. */
export async function clearAttributeChildren(client: TreecrdtClient): Promise<void> {
  await ensureAttributeChildrenSchema(client)
  await client.runner.exec(`DELETE FROM ${TABLE}`)
}

/** Updates the derived attribute-child index for a materialized TreeCRDT change batch. */
export async function refreshAttributeChildrenFromChanges(
  client: TreecrdtClient,
  changes: readonly Change[],
): Promise<void> {
  await ensureAttributeChildrenSchema(client)

  // Keep each node's last reported parent and value: one event can carry hundreds of nodes (a catch-up) and several
  // changes for one node. Undefined was not reported; null is a deleted node or a missing value.
  const nodes = new Map<string, { parent?: string | null; value?: string | null }>()
  for (const ch of changes) {
    if (ch.kind === 'move' && ch.parentBefore === ch.parentAfter) continue
    const node = nodes.get(ch.node) ?? {}
    nodes.set(ch.node, node)
    if (ch.kind !== 'payload') node.parent = ch.kind === 'delete' ? null : ch.parentAfter
    if (ch.kind !== 'move') {
      node.value = ch.kind !== 'delete' && ch.payload ? decodeThoughtPayload(ch.payload).value : null
    }
  }

  const gone: string[] = []
  const rows: [string, string, string][] = []
  const moved: [string, string][] = []
  for (const [id, { parent, value }] of nodes) {
    // Only moves were reported, so an existing row just takes the new parent.
    if (value === undefined) moved.push([id, parent!])
    else if (parent === null || !value || !isAttribute(value)) gone.push(id)
    else {
      // A payload change does not say where the node is.
      const parentId = parent ?? (await client.tree.node(id).parent())?.id
      if (parentId) rows.push([id, parentId, value])
      else gone.push(id)
    }
  }

  // getText also executes parameterized writes (returning null); exec does not accept bind parameters.
  if (gone.length > 0) {
    await client.runner.getText(`DELETE FROM ${TABLE} WHERE child_id IN (SELECT value FROM json_each(?1))`, [
      JSON.stringify(gone),
    ])
  }
  if (rows.length > 0) {
    await client.runner.getText(
      `INSERT INTO ${TABLE} (child_id, parent_id, value) SELECT value->>0, value->>1, value->>2 FROM json_each(?1)
       WHERE true ON CONFLICT(child_id) DO UPDATE SET parent_id = excluded.parent_id, value = excluded.value`,
      [JSON.stringify(rows)],
    )
  }
  if (moved.length > 0) {
    await client.runner.getText(
      `UPDATE ${TABLE} SET parent_id = moved.value->>1 FROM json_each(?1) AS moved WHERE child_id = moved.value->>0`,
      [JSON.stringify(moved)],
    )
  }
}
