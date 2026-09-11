import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import { HOME_TOKEN } from '../../../constants'
import hashThought from '../../../util/hashThought'
import mergeUpdates from '../../../util/mergeUpdates'
import type { ThoughtspaceMaterializationBridge, ThoughtspaceMaterializationSnapshot } from '../../thoughtspace'
import { encodeThoughtPayload } from '../payload'
import { waitForMaterializedThoughtsToStore } from '../sync/materializationQueue'
import createTreecrdtDataProvider from '../thoughtspace'
import { withTreecrdtWriteBarrier } from '../writeBarrier'

const A = '00000000000000000000000000000401' as ThoughtId
const B = '00000000000000000000000000000402' as ThoughtId
const replica = new Uint8Array(32).fill(4)
let client: TreecrdtClient
let unbind: (() => Promise<void>) | undefined

/** Encodes a real node payload for the index lifecycle tests. */
const payload = (value: string) => encodeThoughtPayload({ value, created: 1, lastUpdated: 2, updatedBy: 'test' })

/** Binds a provider to the same database, allowing restart tests to preserve all stored data. */
const bind = async (bridge?: ThoughtspaceMaterializationBridge) => {
  const provider = createTreecrdtDataProvider()
  unbind = await provider.bindClient(client, replica, bridge)
  return provider.db
}

beforeEach(async () => {
  client = await createTreecrdtClient({ storage: { type: 'memory' }, runtime: { type: 'direct' } })
})

afterEach(async () => {
  try {
    await unbind?.()
  } finally {
    unbind = undefined
    await client.drop()
    vi.restoreAllMocks()
  }
})

it('rebuilds memberships from existing thoughts instead of incomplete legacy lexemes', async () => {
  await bind()
  await unbind!()
  await client.local.insert(replica, HOME_TOKEN, A, { type: 'last' }, payload('Cats'))
  await client.local.insert(replica, HOME_TOKEN, B, { type: 'last' }, payload('cat'))
  await client.runner.exec('CREATE TABLE em_lexemes (id TEXT PRIMARY KEY, payload_json TEXT NOT NULL)')
  await client.runner.getText('INSERT INTO em_lexemes VALUES (?1, ?2)', [
    hashThought('cat'),
    JSON.stringify({ contexts: [B], created: 1, lastUpdated: 2, updatedBy: 'test' }),
  ])
  const before = await client.ops.all()
  const db = await bind()

  expect((await db.getLexemeById(hashThought('cat')))?.contexts).toEqual([A, B])
  expect(await client.ops.all()).toEqual(before)
  expect(Array.from((await client.tree.getPayload(A))!)).toEqual(Array.from(payload('Cats')))

  await unbind!()
  const dump = vi.spyOn(client.tree, 'dump')
  const reopened = await bind()
  expect((await reopened.getLexemeById(hashThought('cat')))?.contexts).toEqual([A, B])
  expect(dump).not.toHaveBeenCalled()
})

it('removes an unloaded membership on rename and delete, and restores only the current value', async () => {
  const db = await bind()
  await client.local.insert(replica, HOME_TOKEN, A, { type: 'last' }, payload('cat'))
  await client.local.insert(replica, HOME_TOKEN, B, { type: 'last' }, payload('Cats'))
  await client.local.payload(replica, A, payload('dog'))

  expect((await db.getLexemeById(hashThought('cat')))?.contexts).toEqual([B])
  expect((await db.getLexemeById(hashThought('dog')))?.contexts).toEqual([A])

  await client.local.delete(replica, A)
  expect(await db.getLexemeById(hashThought('dog'))).toBeUndefined()
  // TreeCRDT retains deleted payload bytes; they must not imply live membership.
  expect(Array.from((await client.tree.getPayload(A))!)).toEqual(Array.from(payload('dog')))

  await client.local.insert(replica, HOME_TOKEN, A, { type: 'last' }, payload('cat'))
  expect((await db.getLexemeById(hashThought('cat')))?.contexts).toEqual([A, B])
  expect(await db.getLexemeById(hashThought('dog'))).toBeUndefined()
})

it('repairs an interrupted index update on reopen without checkpointing later writes over the failure', async () => {
  const db = await bind()
  await client.local.insert(replica, HOME_TOKEN, A, { type: 'last' }, payload('cat'))
  await db.getLexemeById(hashThought('cat'))
  const checkpoint = await client.runner.getText('SELECT head_seq FROM em_lexeme_memberships_meta')
  const getText = client.runner.getText.bind(client.runner)
  const failure = new Error('index write interrupted')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const failingWrite = vi.spyOn(client.runner, 'getText').mockImplementation((sql, params) => {
    if (sql.includes('INSERT INTO em_lexeme_memberships ')) return Promise.reject(failure)
    return getText(sql, params)
  })
  await client.local.payload(replica, A, payload('dog'))
  await expect(db.getLexemeById(hashThought('dog'))).rejects.toBe(failure)
  failingWrite.mockRestore()

  await client.local.insert(replica, HOME_TOKEN, B, { type: 'last' }, payload('bird'))
  await expect(db.getLexemeById(hashThought('bird'))).rejects.toBe(failure)
  await expect(waitForMaterializedThoughtsToStore()).rejects.toBe(failure)
  expect(await client.runner.getText('SELECT head_seq FROM em_lexeme_memberships_meta')).toBe(checkpoint)
  await expect(unbind!()).rejects.toBe(failure)
  unbind = undefined

  const reopened = await bind()
  expect(await reopened.getLexemeById(hashThought('cat'))).toBeUndefined()
  expect((await reopened.getLexemeById(hashThought('dog')))?.contexts).toEqual([A])
  expect((await reopened.getLexemeById(hashThought('bird')))?.contexts).toEqual([B])
})

it('does not publish a stale membership read over an intervening optimistic edit', async () => {
  let snapshot: ThoughtspaceMaterializationSnapshot = { thoughtIndex: {}, lexemeIndex: {} }
  const published: string[][] = []
  const db = await bind({
    getSnapshot: () => snapshot,
    apply: updates => {
      snapshot = {
        thoughtIndex: mergeUpdates(snapshot.thoughtIndex, updates.thoughtIndex),
        lexemeIndex: mergeUpdates(snapshot.lexemeIndex, updates.lexemeIndex),
      }
      published.push(Object.keys(snapshot.lexemeIndex))
    },
  })
  await client.local.insert(replica, HOME_TOKEN, A, { type: 'last' }, payload('cat'))
  await waitForMaterializedThoughtsToStore()

  let markReadStarted!: () => void
  let releaseRead!: () => void
  const readStarted = new Promise<void>(resolve => {
    markReadStarted = resolve
  })
  const readReleased = new Promise<void>(resolve => {
    releaseRead = resolve
  })
  const getText = client.runner.getText.bind(client.runner)
  let pauseNextRead = true
  vi.spyOn(client.runner, 'getText').mockImplementation(async (sql, params) => {
    const result = await getText(sql, params)
    if (pauseNextRead && sql.includes('FROM (SELECT * FROM em_lexeme_memberships')) {
      pauseNextRead = false
      markReadStarted()
      await readReleased
    }
    return result
  })

  const before = snapshot.thoughtIndex[A]
  const first = { ...before, value: 'dog' }
  snapshot = { ...snapshot, thoughtIndex: { ...snapshot.thoughtIndex, [A]: first } }
  await withTreecrdtWriteBarrier(() =>
    db.updateThoughts({ thoughtIndexUpdates: { [A]: first }, lexemeIndexUpdates: {} }),
  )
  await readStarted

  const second = { ...first, value: 'bird' }
  snapshot = { ...snapshot, thoughtIndex: { ...snapshot.thoughtIndex, [A]: second } }
  published.length = 0
  const write = withTreecrdtWriteBarrier(() =>
    db.updateThoughts({ thoughtIndexUpdates: { [A]: second }, lexemeIndexUpdates: {} }),
  )
  releaseRead()
  await write
  await waitForMaterializedThoughtsToStore()

  expect(snapshot.thoughtIndex[A].value).toBe('bird')
  expect(snapshot.lexemeIndex[hashThought('bird')]?.contexts).toEqual([A])
  expect(snapshot.lexemeIndex[hashThought('dog')]).toBeUndefined()
  expect(snapshot.lexemeIndex[hashThought('cat')]).toBeUndefined()
  expect(published.flat()).not.toContain(hashThought('dog'))
})
