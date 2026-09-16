import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { HOME_TOKEN } from '../../../constants'
import hashThought from '../../../util/hashThought'
import { encodeThoughtPayload } from '../payload'
import createTreecrdtDataProvider from '../thoughtspace'
import { waitForTreecrdtWriteBarrier } from '../writeBarrier'

const A = '00000000000000000000000000000401' as ThoughtId
const B = '00000000000000000000000000000402' as ThoughtId
const replica = new Uint8Array(32).fill(4)
let client: TreecrdtClient
let closeBinding: (() => Promise<void>) | undefined

/** Encodes a real node payload for the index lifecycle tests. */
const payload = (value: string) => encodeThoughtPayload({ value, created: 1, lastUpdated: 2, updatedBy: 'test' })

/** Binds a provider to the same database, allowing restart tests to preserve all stored data. */
const bind = async () => {
  const provider = createTreecrdtDataProvider()
  ;({ closeBinding } = await provider.bindClient(client, replica))
  return provider.db
}

beforeEach(async () => {
  client = await createTreecrdtClient({ storage: { type: 'memory' }, runtime: { type: 'direct' } })
})

afterEach(async () => {
  try {
    await closeBinding?.()
  } finally {
    closeBinding = undefined
    await client.drop()
    vi.restoreAllMocks()
  }
})

it('rebuilds memberships from existing thoughts instead of incomplete legacy lexemes', async () => {
  await bind()
  await closeBinding!()
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

  await closeBinding!()
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
  const checkpoint = await client.runner.getText('SELECT head_seq FROM em_derived_indexes_meta')
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
  await expect(waitForTreecrdtWriteBarrier()).rejects.toBe(failure)
  expect(await client.runner.getText('SELECT head_seq FROM em_derived_indexes_meta')).toBe(checkpoint)
  await expect(closeBinding!()).rejects.toBe(failure)
  closeBinding = undefined

  const reopened = await bind()
  expect(await reopened.getLexemeById(hashThought('cat'))).toBeUndefined()
  expect((await reopened.getLexemeById(hashThought('dog')))?.contexts).toEqual([A])
  expect((await reopened.getLexemeById(hashThought('bird')))?.contexts).toEqual([B])
})

it('rebuilds attribute children and memberships when reopening after a missed materialization', async () => {
  const db = await bind()
  await db.updateThoughts({
    thoughtIndexUpdates: {
      [A]: {
        value: '=pin',
        parentId: HOME_TOKEN,
        rank: 0,
        created: 1 as Timestamp,
        lastUpdated: 2 as Timestamp,
        updatedBy: 'test',
      },
    },
  })
  await closeBinding!()
  // Arrange the durable state left when the tree commits but the app exits before indexing the event.
  await client.local.payload(replica, A, payload('=archive'))

  const reopened = await bind()

  expect((await reopened.getThoughtById(HOME_TOKEN))!.childrenMap).toEqual({ '=archive': A })
  expect((await reopened.getLexemeById(hashThought('=archive')))?.contexts).toEqual([A])
  expect(await reopened.getLexemeById(hashThought('=pin'))).toBeUndefined()
})
