import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import { withTreecrdtWriteBarrier } from '../../writeBarrier'
import { applyMaterializedThoughtsToStore } from '../applyMaterializedThoughtsToStore'
import { enqueueMaterializedThoughtsToStoreWork, waitForMaterializedThoughtsToStore } from '../materializationQueue'

it('waits for materialization work queued while waiting for idle', async () => {
  const order: string[] = []
  let finishFirst!: () => void

  const first = enqueueMaterializedThoughtsToStoreWork(async () => {
    order.push('first:start')
    await new Promise<void>(resolve => {
      finishFirst = resolve
    })
    order.push('first:end')
  })

  const wait = waitForMaterializedThoughtsToStore().then(() => {
    order.push('idle')
  })

  const second = enqueueMaterializedThoughtsToStoreWork(async () => {
    order.push('second')
  })

  await Promise.resolve()
  finishFirst()
  await Promise.all([first, second, wait])

  expect(order).toEqual(['first:start', 'first:end', 'second', 'idle'])
})

it('surfaces materialization failures when waiting for idle', async () => {
  const err = new Error('materialization failed')

  await expect(
    enqueueMaterializedThoughtsToStoreWork(async () => {
      throw err
    }),
  ).rejects.toThrow('materialization failed')

  await expect(waitForMaterializedThoughtsToStore()).rejects.toThrow('materialization failed')
  await expect(waitForMaterializedThoughtsToStore()).resolves.toBeUndefined()
})

it('rejects materialization before reading or applying state when local persistence failed', async () => {
  const err = new Error('local write failed')
  await expect(
    withTreecrdtWriteBarrier(async () => {
      throw err
    }),
  ).rejects.toBe(err)

  const snapshot = { thoughtIndex: {}, lexemeIndex: {} }
  const bridge = { getSnapshot: vi.fn(() => snapshot), apply: vi.fn() }
  const db = { getThoughtById: vi.fn(), getLexemeById: vi.fn(), updateThoughts: vi.fn() }
  const client = {
    runner: { exec: vi.fn() },
    tree: { exists: vi.fn().mockResolvedValue(false) },
  } as unknown as TreecrdtClient

  await expect(
    applyMaterializedThoughtsToStore(
      { headSeq: 1, changes: [{ kind: 'payload', node: 'remote-a', payload: null }] },
      { bridge, client, db, writeFailureVersion: 0 },
    ),
  ).rejects.toBe(err)

  expect(bridge.getSnapshot).not.toHaveBeenCalled()
  expect(bridge.apply).not.toHaveBeenCalled()
  expect(client.runner.exec).not.toHaveBeenCalled()
  expect(client.tree.exists).not.toHaveBeenCalled()
  expect(db.getThoughtById).not.toHaveBeenCalled()
  expect(db.getLexemeById).not.toHaveBeenCalled()
  expect(db.updateThoughts).not.toHaveBeenCalled()
})
