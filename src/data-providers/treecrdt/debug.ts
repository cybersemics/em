import type { Operation } from '@treecrdt/interface'
import type { TreecrdtSqlitePlacement } from '@treecrdt/interface/sqlite'
import { GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID } from '../../constants'
import { pushTreecrdtLocalOpsToRemote } from './sync'
import {
  type ThoughtPayload,
  decodeThoughtPayload,
  encodeThoughtPayload,
  getThoughtspaceReplicaId,
} from './thoughtspace'
import { getTreecrdtClient } from './treecrdt'

type TreeDumpRow = { node: string; parent: string | null; tombstone: boolean }

export type DumpTreecrdtRow = {
  id: string
  parent: string | null
  tombstone: boolean
  value: string | null
  index: number
}

export type DumpTreecrdtOptions = {
  includeTombstones?: boolean
}

/**
 * Fetches all treecrdt nodes via tree.dump(), enriches with parsed payloads,
 * and returns rows suitable for console.table().
 */
export async function dumpTreecrdt(opts: DumpTreecrdtOptions = {}): Promise<DumpTreecrdtRow[]> {
  const { includeTombstones = false } = opts
  const client = getTreecrdtClient()
  const rows = await client.tree.dump()

  const filtered = includeTombstones ? rows : (rows as TreeDumpRow[]).filter(r => !r.tombstone)

  const result: DumpTreecrdtRow[] = await Promise.all(
    filtered.map(async (row: TreeDumpRow) => {
      let value: string | null = null

      const payloadBytes = await client.tree.getPayload(row.node)
      if (payloadBytes !== null && payloadBytes.length > 0) {
        try {
          const payload = decodeThoughtPayload(payloadBytes)
          value = payload.value
        } catch {
          value = '[parse error]'
        }
      }

      const parentId = row.parent ?? GLOBAL_ROOT_TOKEN
      const children = await client.tree.children(parentId)
      const index = row.parent === null ? 0 : children.indexOf(row.node)

      return {
        id: row.node,
        parent: row.parent,
        tombstone: row.tombstone,
        value,
        index,
      }
    }),
  )

  return result
}

/**
 * DevTools: choose a semantic JSON fixture (`[{ "op": "insert" | … }, …]` or `{ ops: … }`),
 * mint operations with `client.local.*` using the session replica, then push for sync.
 */
export async function treeFromJson(): Promise<void | null> {
  /* eslint-disable jsdoc/require-jsdoc -- nested helpers for this entry only */
  if (typeof document === 'undefined') {
    throw new Error('treeFromJson requires a browser (document)')
  }

  function assertRecord(row: unknown, index: number): Record<string, unknown> {
    if (typeof row !== 'object' || row === null) {
      throw new Error(`Semantic op at index ${index}: expected object, got ${String(row)}`)
    }
    return row as Record<string, unknown>
  }

  async function pickJsonFile(): Promise<File | null> {
    const pick = (
      globalThis as typeof globalThis & {
        showOpenFilePicker?: (options: {
          types?: { description: string; accept: Record<string, string[]> }[]
          multiple?: boolean
        }) => Promise<FileSystemFileHandle[]>
      }
    ).showOpenFilePicker
    if (typeof pick === 'function') {
      try {
        const handles = await pick({
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
          multiple: false,
        })
        const h = handles[0]
        if (!h) return null
        return await h.getFile()
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return null
        throw e
      }
    }

    /* eslint-disable @typescript-eslint/no-use-before-define -- promise executor handlers refer to each other */
    return new Promise<File | null>(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json,.json'
      input.style.display = 'none'

      let settled = false

      function complete(file: File | null): void {
        if (settled) return
        settled = true
        window.removeEventListener('focus', onWindowFocusMaybeCancel)
        input.removeEventListener('cancel', onCancel)
        input.remove()
        resolve(file)
      }

      function onCancel(): void {
        complete(null)
      }

      function onWindowFocusMaybeCancel(): void {
        setTimeout(() => {
          if (!settled && (input.files === null || input.files.length === 0)) complete(null)
        }, 320)
      }

      input.addEventListener('cancel', onCancel)
      input.addEventListener(
        'change',
        () => {
          complete(input.files?.[0] ?? null)
        },
        { once: true },
      )
      input.addEventListener('error', () => complete(null), { once: true })
      window.addEventListener('focus', onWindowFocusMaybeCancel, { once: true })
      document.body.appendChild(input)
      input.click()
    })
    /* eslint-enable @typescript-eslint/no-use-before-define */
  }

  function unwrapSemanticOps(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'object' && raw !== null) {
      const o = raw as { ops?: unknown; operations?: unknown }
      if (Array.isArray(o.ops)) return o.ops
      if (Array.isArray(o.operations)) return o.operations
    }
    throw new Error('JSON root must be an array of semantic ops, or an object with `ops` / `operations` array')
  }

  function treeParentId(parent: string): string {
    return parent === ROOT_PARENT_ID ? GLOBAL_ROOT_TOKEN : parent
  }

  function parsePlacement(raw: unknown, index: number): TreecrdtSqlitePlacement {
    if (raw === undefined || raw === null) return { type: 'last' }
    if (raw === 'last' || raw === 'first') return { type: raw }
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`operations[${index}].placement: expected string first|last or placement object`)
    }
    const t = (raw as { type?: unknown }).type
    if (t === 'last' || t === 'first') return { type: t }
    if (t === 'after') {
      const after = (raw as { after?: unknown }).after
      if (typeof after !== 'string') {
        throw new Error(`operations[${index}].placement: after placement needs string "after" sibling id`)
      }
      return { type: 'after', after }
    }
    throw new Error(`operations[${index}].placement: unsupported shape`)
  }

  function thoughtPayloadFromJson(raw: unknown, index: number): ThoughtPayload {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`operations[${index}].thought: object expected`)
    }
    const o = raw as Record<string, unknown>
    if (typeof o.value !== 'string') throw new Error(`operations[${index}].thought.value: string expected`)
    if (typeof o.created !== 'number' || !Number.isFinite(o.created)) {
      throw new Error(`operations[${index}].thought.created: number (ms) expected`)
    }
    if (typeof o.lastUpdated !== 'number' || !Number.isFinite(o.lastUpdated)) {
      throw new Error(`operations[${index}].thought.lastUpdated: number (ms) expected`)
    }
    if (typeof o.updatedBy !== 'string') {
      throw new Error(`operations[${index}].thought.updatedBy: string expected`)
    }
    const base: ThoughtPayload = {
      value: o.value,
      created: o.created,
      lastUpdated: o.lastUpdated,
      updatedBy: o.updatedBy,
    }
    if (o.archived !== undefined) {
      if (typeof o.archived !== 'number' || !Number.isFinite(o.archived)) {
        throw new Error(`operations[${index}].thought.archived: number expected`)
      }
      base.archived = o.archived
    }
    return base
  }

  const file = await pickJsonFile()
  if (!file) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text()) as unknown
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
  }

  const rows = unwrapSemanticOps(parsed)
  const replica = getThoughtspaceReplicaId()
  const client = getTreecrdtClient()
  const minted: Operation[] = []

  for (let index = 0; index < rows.length; index++) {
    const row = assertRecord(rows[index], index)
    const op = row.op
    if (typeof op !== 'string') {
      throw new Error(`operations[${index}]: missing string "op"`)
    }

    switch (op) {
      case 'insert': {
        if (typeof row.parent !== 'string' || typeof row.node !== 'string') {
          throw new Error(`operations[${index}]: insert requires string parent and node`)
        }
        const parent = treeParentId(row.parent)
        const placement = parsePlacement(row.placement, index)
        const payloadBytes =
          'thought' in row && row.thought !== undefined && row.thought !== null
            ? encodeThoughtPayload(thoughtPayloadFromJson(row.thought, index))
            : null
        minted.push(await client.local.insert(replica, parent, row.node, placement, payloadBytes))
        break
      }
      case 'move': {
        if (typeof row.node !== 'string' || typeof row.parent !== 'string' || !(row.node && row.parent)) {
          throw new Error(`operations[${index}]: move requires string node and parent (new parent)`)
        }
        const newParent = treeParentId(row.parent)
        const placement = parsePlacement(row.placement, index)
        minted.push(await client.local.move(replica, row.node, newParent, placement))
        break
      }
      case 'delete':
      case 'del': {
        if (typeof row.node !== 'string') {
          throw new Error(`operations[${index}]: ${op} requires string node`)
        }
        minted.push(await client.local.delete(replica, row.node))
        break
      }
      case 'payload': {
        if (typeof row.node !== 'string') {
          throw new Error(`operations[${index}]: payload requires string node`)
        }
        const bytes =
          row.thought === null || row.thought === undefined
            ? null
            : encodeThoughtPayload(thoughtPayloadFromJson(row.thought, index))
        minted.push(await client.local.payload(replica, row.node, bytes))
        break
      }
      default:
        throw new Error(`operations[${index}]: unknown op ${JSON.stringify(op)}`)
    }
  }

  if (minted.length > 0) {
    await pushTreecrdtLocalOpsToRemote(minted)
  }

  /* eslint-enable jsdoc/require-jsdoc */
  return null
}
