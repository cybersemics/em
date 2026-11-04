/* eslint-disable import/prefer-default-export */
import type { Change, TreecrdtChangedNode } from '@treecrdt/interface/engine'
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

/**
 * Injects bound parameters into SQL for `runner.exec`, which does not accept bind args.
 * Only `?1` ... `?n` placeholders are supported, in order.
 */
function bindParams(sql: string, params: (string | number | null)[]): string {
  let out = sql
  for (let i = params.length - 1; i >= 0; i--) {
    const p = params[i]
    const lit = p === null ? 'NULL' : typeof p === 'number' ? String(p) : `'${String(p).replace(/'/g, "''")}'`
    out = out.replace(new RegExp(`\\?${i + 1}\\b`, 'g'), lit)
  }
  return out
}

/** Ensures the derived attribute-child index schema exists. */
export async function ensureAttributeChildrenSchema(client: TreecrdtClient): Promise<void> {
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

/** Deletes one child from the attribute-child index. */
export async function deleteAttributeChild(client: TreecrdtClient, childId: ThoughtId): Promise<void> {
  await ensureAttributeChildrenSchema(client)
  await client.runner.exec(bindParams(`DELETE FROM ${TABLE} WHERE child_id = ?1`, [childId]))
}

/** Upserts an attribute child into the derived index. */
export async function upsertAttributeChild(
  client: TreecrdtClient,
  parentId: ThoughtId,
  childId: ThoughtId,
  value: string,
): Promise<void> {
  await ensureAttributeChildrenSchema(client)

  const sql = `INSERT INTO ${TABLE} (child_id, parent_id, value) VALUES (?1, ?2, ?3)
    ON CONFLICT(child_id) DO UPDATE SET parent_id = excluded.parent_id, value = excluded.value`
  await client.runner.exec(bindParams(sql, [childId, parentId, value]))
}

/** Upserts or removes a child from the derived attribute-child index based on a known current value. */
export async function syncAttributeChild(
  client: TreecrdtClient,
  parentId: ThoughtId,
  childId: ThoughtId,
  value: string,
): Promise<void> {
  if (isAttribute(value)) {
    await upsertAttributeChild(client, parentId, childId, value)
  } else {
    await deleteAttributeChild(client, childId)
  }
}

/** Updates the indexed parent for a moved child, if the child is indexed. */
export async function moveAttributeChild(
  client: TreecrdtClient,
  parentId: ThoughtId,
  childId: ThoughtId,
): Promise<void> {
  await ensureAttributeChildrenSchema(client)
  await client.runner.exec(bindParams(`UPDATE ${TABLE} SET parent_id = ?1 WHERE child_id = ?2`, [parentId, childId]))
}

/** Replaces the rows of changed nodes from their current parent and value. */
export async function applyAttributeChildren(
  client: TreecrdtClient,
  nodes: readonly TreecrdtChangedNode[],
): Promise<void> {
  if (nodes.length === 0) return
  await ensureAttributeChildrenSchema(client)
  const rows: [string, string, string][] = []
  for (const node of nodes) {
    if (node.tombstone || !node.payload || node.parent === null) continue
    const { value } = decodeThoughtPayload(node.payload)
    if (isAttribute(value)) rows.push([node.node, node.parent, value])
  }
  // getText also executes parameterized writes (returning null); exec does not accept bind parameters.
  await client.runner.getText(`DELETE FROM ${TABLE} WHERE child_id IN (SELECT value FROM json_each(?1))`, [
    JSON.stringify(nodes.map(node => node.node)),
  ])
  if (rows.length > 0) {
    await client.runner.getText(
      `INSERT INTO ${TABLE} (child_id, parent_id, value) SELECT value->>0, value->>1, value->>2 FROM json_each(?1)`,
      [JSON.stringify(rows)],
    )
  }
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

  for (const ch of changes) {
    const childId = ch.node as ThoughtId
    switch (ch.kind) {
      case 'insert':
      case 'restore':
        if (ch.payload && ch.parentAfter) {
          await syncAttributeChild(client, ch.parentAfter as ThoughtId, childId, decodeThoughtPayload(ch.payload).value)
        } else {
          await deleteAttributeChild(client, childId)
        }
        break
      case 'move':
        if (ch.parentBefore !== ch.parentAfter) {
          await moveAttributeChild(client, ch.parentAfter as ThoughtId, childId)
        }
        break
      case 'payload': {
        if (!ch.payload) {
          await deleteAttributeChild(client, childId)
          break
        }
        const payload = decodeThoughtPayload(ch.payload)
        if (!isAttribute(payload.value)) {
          await deleteAttributeChild(client, childId)
          break
        }
        const parent = await client.tree.node(childId).parent()
        if (!parent) {
          await deleteAttributeChild(client, childId)
        } else {
          await upsertAttributeChild(client, parent.id as ThoughtId, childId, payload.value)
        }
        break
      }
      case 'delete':
        await deleteAttributeChild(client, childId)
        break
    }
  }
}
