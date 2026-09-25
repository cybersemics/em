import { deriveOpRefV0 } from '@treecrdt/sync-protocol'
import { createInMemoryConnectedPeers } from '@treecrdt/sync-protocol/in-memory'
import { treecrdtSyncV0ProtobufCodec } from '@treecrdt/sync-protocol/protobuf'
import { createTreecrdtSyncBackendFromClient } from '@treecrdt/sync-sqlite'
import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { createMemoryClient } from '@treecrdt/wasm'
import { createMemorySyncBackend } from '@treecrdt/wasm/sync'

const ROOT = '0'.repeat(32)
const A = '1'.repeat(32)
const B = '2'.repeat(32)
const CHILD = '3'.repeat(32)
const LOCAL = '4'.repeat(32)
const encoder = new TextEncoder()

it('syncs the complete document, preserves authored operations, and reconciles incoming moves', async () => {
  const persistent = await createTreecrdtClient({ docId: 'loopback', storage: { type: 'memory' } })
  const replica = new Uint8Array(32).fill(8)
  const memory = await createMemoryClient()
  const peers = createInMemoryConnectedPeers({
    backendA: createMemorySyncBackend(memory, { docId: 'loopback' }),
    backendB: createTreecrdtSyncBackendFromClient(persistent, 'loopback'),
    codec: treecrdtSyncV0ProtobufCodec,
  })
  try {
    await persistent.local.insert(replica, ROOT, A, { type: 'first' }, encoder.encode('a'))
    await persistent.local.insert(replica, ROOT, B, { type: 'after', after: A }, encoder.encode('b'))
    await persistent.local.insert(replica, A, CHILD, { type: 'first' }, encoder.encode('child'))

    await peers.peerA.syncOnce(peers.transportA, { all: {} })
    expect(memory.tree.children(ROOT)).toEqual([A, B])
    expect(memory.tree.exists(CHILD)).toBe(true)
    expect(memory.tree.children(A)).toEqual([CHILD])

    const op = memory.local.insert(A, LOCAL, CHILD, encoder.encode('local'))
    // No Promise or storage read is needed to see the authored state.
    expect(memory.tree.children(A)).toEqual([CHILD, LOCAL])
    expect(await persistent.tree.exists(LOCAL)).toBe(false)
    await persistent.ops.appendMany([op])
    expect(await persistent.ops.get([deriveOpRefV0('loopback', op.meta.id)])).toEqual([op])
    expect(await persistent.tree.children(A)).toEqual([CHILD, LOCAL])

    await persistent.local.move(replica, CHILD, B, { type: 'first' })
    await persistent.local.payload(replica, LOCAL, encoder.encode('remote rename'))
    await peers.peerA.syncOnce(peers.transportA, { all: {} })
    expect(memory.tree.children(A)).toEqual([LOCAL])
    expect(memory.tree.get(CHILD)?.parentId).toBe(B)
    expect(new TextDecoder().decode(memory.tree.payload(LOCAL)!)).toBe('remote rename')

    const deletion = memory.local.delete(LOCAL)
    await persistent.ops.appendMany([deletion])
    expect(memory.tree.exists(LOCAL)).toBe(false)
    expect(await persistent.tree.exists(LOCAL)).toBe(false)
  } finally {
    peers.detach()
    memory.close()
    await persistent.close()
  }
})
