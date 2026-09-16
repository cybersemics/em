/* eslint-disable import/prefer-default-export */
import type { Change } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Index from '../../@types/IndexType'
import type ThoughtId from '../../@types/ThoughtId'
import { GLOBAL_ROOT_TOKEN } from '../../constants'
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

/** Reindexes a single child from TreeCRDT's current materialized state. */
export async function reindexAttributeChild(client: TreecrdtClient, childId: ThoughtId): Promise<void> {
  await ensureAttributeChildrenSchema(client)
  const [payloadBytes, parentIdRaw] = await Promise.all([client.tree.getPayload(childId), client.tree.parent(childId)])

  if (!payloadBytes || parentIdRaw === null) {
    await deleteAttributeChild(client, childId)
    return
  }

  const payload = decodeThoughtPayload(payloadBytes)
  await syncAttributeChild(client, parentIdRaw as ThoughtId, childId, payload.value)
}

/** Rebuilds the derived attribute-child index by walking the materialized TreeCRDT tree once. */
export async function rebuildAttributeChildrenIndex(client: TreecrdtClient): Promise<void> {
  await ensureAttributeChildrenSchema(client)
  await client.runner.exec(`DELETE FROM ${TABLE}`)

  const parentQueue = [GLOBAL_ROOT_TOKEN]
  for (let i = 0; i < parentQueue.length; i++) {
    const parentId = parentQueue[i]
    const childIds = (await client.tree.children(parentId)) as ThoughtId[]

    for (const childId of childIds) {
      await reindexAttributeChild(client, childId)
      parentQueue.push(childId)
    }
  }
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
        const parentIdRaw = await client.tree.parent(childId)
        if (parentIdRaw === null) {
          await deleteAttributeChild(client, childId)
        } else {
          await upsertAttributeChild(client, parentIdRaw as ThoughtId, childId, payload.value)
        }
        break
      }
      case 'delete':
        await deleteAttributeChild(client, childId)
        break
    }
  }
}
