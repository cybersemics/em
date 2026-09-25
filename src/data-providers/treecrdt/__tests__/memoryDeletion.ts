import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import { HOME_TOKEN } from '../../../constants'
import { tsid } from '../../thoughtspaceSession'
import createMemoryThoughtspace from '../createMemoryThoughtspace'
import initializeMemoryStorage from '../initializeMemoryStorage'
import { encodeThoughtPayload } from '../payload'

it.each([false, true])(
  'keeps a deep startup deletion durable after reloading its operation log (delete descendants: %s)',
  async deleteDescendants => {
    const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
    const runtime = createMemoryThoughtspace(async () => persistent)
    const replica = new Uint8Array(32).fill(12)
    const ids = ['a', 'b', 'c', 'd'].map(value => value.repeat(32) as ThoughtId)
    let reloaded: ReturnType<typeof createMemoryThoughtspace> | undefined
    try {
      await initializeMemoryStorage(persistent, replica)
      for (const [index, id] of ids.entries()) {
        await persistent.local.insert(
          replica,
          index ? ids[index - 1] : HOME_TOKEN,
          id,
          { type: 'last' },
          encodeThoughtPayload({ value: `level ${index}`, created: 1, lastUpdated: 1, updatedBy: 'remote' }),
        )
      }
      await persistent.local.payload(
        replica,
        ids[3],
        encodeThoughtPayload({ value: 'deep edit before startup', created: 1, lastUpdated: 2, updatedBy: 'remote' }),
      )
      await runtime.init({ storage: 'memory' })
      expect(runtime.ready).toBe(true)
      const initial = runtime.project()
      expect(ids.map(id => initial.thoughtIndex[id].parentId)).toEqual([HOME_TOKEN, ...ids.slice(0, -1)])
      expect(initial.thoughtIndex[ids[3]].value).toBe('deep edit before startup')

      const deletedIds = deleteDescendants ? ids : [ids[0]]
      const committed = runtime.transact(document =>
        document.update({ thoughtIndexUpdates: Object.fromEntries(deletedIds.map(id => [id, null])) }),
      )
      expect(committed.value.thoughtIndex[ids[0]]).toBeUndefined()
      expect(Object.values(committed.value.thoughtIndex[HOME_TOKEN].childrenMap)).not.toContain(ids[0])
      await committed.persisted
      await runtime.waitForIdle()
      for (const id of deletedIds) {
        expect(await persistent.tree.exists(id)).toBe(false)
        expect(runtime.project().thoughtIndex[id]).toBeUndefined()
      }

      // Reconstruct a fresh SQLite instance from the exact persisted log, then open a fresh memory runtime.
      const durableOps = await persistent.ops.all()
      const restoredClient = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
      reloaded = createMemoryThoughtspace(async () => restoredClient)
      await restoredClient.ops.appendMany(durableOps)
      await reloaded.init({ storage: 'memory' })
      await reloaded.waitForIdle()
      const restored = reloaded.project()
      expect(Object.values(restored.thoughtIndex[HOME_TOKEN].childrenMap)).not.toContain(ids[0])
      for (const id of deletedIds) {
        expect(restored.thoughtIndex[id]).toBeUndefined()
        expect(await restoredClient.tree.exists(id)).toBe(false)
      }
    } finally {
      await reloaded?.drop()
      await runtime.drop()
    }
  },
)
