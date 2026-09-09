import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../../@types/ThoughtId'
import { clearActionCreator as clear } from '../../../../actions/clear'
import { pullActionCreator as pull } from '../../../../actions/pull'
import { HOME_TOKEN } from '../../../../constants'
import { initialize } from '../../../../initialize'
import exportContext from '../../../../selectors/exportContext'
import getLexeme from '../../../../selectors/getLexeme'
import getThoughtById from '../../../../selectors/getThoughtById'
import store from '../../../../stores/app'
import { resetStores } from '../../../../stores/ministore'
import { editThoughtByContextActionCreator as editThought } from '../../../../test-helpers/editThoughtByContext'
import waitForThoughtspaceIdle from '../../../../test-helpers/waitForThoughtspaceIdle'
import hashThought from '../../../../util/hashThought'
import db, { thoughtspaceRuntime } from '../../../thoughtspace'
import { encodeThoughtPayload } from '../../payload'

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }))

vi.mock('@treecrdt/wa-sqlite', async importOriginal => {
  const actual = await importOriginal<typeof import('@treecrdt/wa-sqlite')>()
  return { ...actual, createTreecrdtClient: createClient.mockImplementation(actual.createTreecrdtClient) }
})

const REPLICA = new Uint8Array(32).fill(2)
const A = '00000000000000000000000000000201' as ThoughtId
const B = '00000000000000000000000000000202' as ThoughtId
const C = '00000000000000000000000000000203' as ThoughtId

let receiver: TreecrdtClient
let sender: TreecrdtClient
let cleanup: () => void

beforeEach(async () => {
  vi.useFakeTimers()
  store.dispatch(clear())
  resetStores()
  createClient.mockClear()
  ;({ cleanup } = await initialize({ storage: 'memory' }))
  receiver = await createClient.mock.results[0].value
  await vi.runAllTimersAsync()
  await waitForThoughtspaceIdle()

  sender = await createTreecrdtClient({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: receiver.docId,
  })
  await sender.ops.appendMany(await receiver.ops.all())
})

afterEach(async () => {
  cleanup()
  await vi.runAllTimersAsync()
  await waitForThoughtspaceIdle()
  await sender.drop()
  await thoughtspaceRuntime.drop()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it.each([
  { name: 'sibling order', parent: HOME_TOKEN, outline: '  - c\n  - a\n  - b' },
  { name: 'both parents after a move', parent: B, outline: '  - a\n  - b\n    - c' },
])('reconstructs $name from history delivered in separate batches', async ({ parent, outline }) => {
  const metadata = { created: 1, lastUpdated: 1, updatedBy: 'sender' }
  const inserts = [
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      A,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'a' }),
    ),
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      B,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'b' }),
    ),
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      C,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'c' }),
    ),
  ]
  await receiver.ops.appendMany(inserts)
  await waitForThoughtspaceIdle()

  expect(getThoughtById(store.getState(), HOME_TOKEN)?.pending).not.toBe(true)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)

  const move = await sender.local.move(REPLICA, C, parent, { type: 'first' })
  await receiver.ops.append(move)
  await waitForThoughtspaceIdle()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}\n${outline}`)

  await receiver.ops.append(await sender.local.delete(REPLICA, C))
  await waitForThoughtspaceIdle()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
  expect(await db.getThoughtById(C)).toBeUndefined()
})

it('preserves a local edit queued while incoming structure is being read', async () => {
  const metadata = { created: 1, lastUpdated: 1, updatedBy: 'sender' }
  await receiver.ops.appendMany([
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      A,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'a' }),
    ),
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      B,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'b' }),
    ),
  ])
  await waitForThoughtspaceIdle()

  let markRead!: () => void
  let releaseRead!: () => void
  const readStarted = new Promise<void>(resolve => {
    markRead = resolve
  })
  const readReleased = new Promise<void>(resolve => {
    releaseRead = resolve
  })
  const getPayload = receiver.tree.getPayload
  let paused = false
  vi.spyOn(receiver.tree, 'getPayload').mockImplementation(async id => {
    const payload = await getPayload(id)
    if (id === A && !paused) {
      paused = true
      markRead()
      await readReleased
    }
    return payload
  })

  const move = await sender.local.move(REPLICA, B, HOME_TOKEN, { type: 'first' })
  await receiver.ops.append(move)
  await readStarted
  const observedValues: string[] = []
  const unsubscribe = store.subscribe(() => {
    observedValues.push(getThoughtById(store.getState(), A)!.value)
  })
  try {
    store.dispatch(editThought(['a'], 'local'))
  } finally {
    releaseRead()
  }
  await waitForThoughtspaceIdle()
  unsubscribe()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - b
  - local`)
  expect(observedValues).not.toContain('a')
  expect(await db.getLexemeById(hashThought('a'))).toBeUndefined()
  expect((await db.getLexemeById(hashThought('local')))?.contexts).toEqual([A])
})

it('preserves an unsaved local edit after its persistence error has been observed', async () => {
  const metadata = { created: 1, lastUpdated: 1, updatedBy: 'sender' }
  await receiver.ops.appendMany([
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      A,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'a' }),
    ),
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      B,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'b' }),
    ),
  ])
  await waitForThoughtspaceIdle()

  const writeError = new Error('local payload write failed')
  vi.spyOn(receiver.local, 'payload').mockRejectedValueOnce(writeError)
  const errors = vi.spyOn(console, 'error')
  store.dispatch(editThought(['a'], 'local'))

  // Observing the one-shot error must not imply that the optimistic edit reached storage.
  await expect(thoughtspaceRuntime.waitForIdle()).rejects.toBe(writeError)
  expect(errors).toHaveBeenCalledWith('Thoughtspace persistence failed', writeError)
  expect(getThoughtById(store.getState(), A)?.value).toBe('local')
  expect((await db.getThoughtById(A))?.value).toBe('a')

  await receiver.ops.append(await sender.local.move(REPLICA, B, HOME_TOKEN, { type: 'first' }))
  await expect(thoughtspaceRuntime.waitForIdle()).rejects.toThrow('materialization suspended')
  // The materialization and write barriers each report the suspended attempt; neither clears its safety guard.
  await expect(thoughtspaceRuntime.waitForIdle()).rejects.toThrow('materialization suspended')

  expect(await receiver.tree.children(HOME_TOKEN)).toEqual([B, A])
  expect(getThoughtById(store.getState(), A)?.value).toBe('local')

  // A successful save of another thought does not repair A's failed save.
  store.dispatch(editThought(['b'], 'saved'))
  await waitForThoughtspaceIdle()
  expect((await db.getThoughtById(B))?.value).toBe('saved')
  await receiver.ops.append(await sender.local.move(REPLICA, B, HOME_TOKEN, { type: 'last' }))
  await expect(thoughtspaceRuntime.waitForIdle()).rejects.toThrow('materialization suspended')
  await expect(thoughtspaceRuntime.waitForIdle()).rejects.toThrow('materialization suspended')
  expect(getThoughtById(store.getState(), A)?.value).toBe('local')
})

it('waits for published lexeme membership to persist before a pull reads its cache', async () => {
  const metadata = { created: 1, lastUpdated: 1, updatedBy: 'sender' }
  await receiver.ops.appendMany([
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      A,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'old' }),
    ),
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      B,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'shared' }),
    ),
  ])
  await waitForThoughtspaceIdle()

  const sharedHash = hashThought('shared')
  expect((await db.getLexemeById(sharedHash))?.contexts).toEqual([B])

  let markWrite!: () => void
  let releaseWrite!: () => void
  const writeStarted = new Promise<void>(resolve => {
    markWrite = resolve
  })
  const writeReleased = new Promise<void>(resolve => {
    releaseWrite = resolve
  })
  const exec = receiver.runner.exec
  vi.spyOn(receiver.runner, 'exec').mockImplementation(async sql => {
    // Hold only the derived cache row; the engine operation and Redux publication remain real.
    if (sql.includes('INSERT INTO em_lexemes') && sql.includes(sharedHash)) {
      markWrite()
      await writeReleased
    }
    return exec(sql)
  })

  await receiver.ops.append(
    await sender.local.payload(REPLICA, A, encodeThoughtPayload({ ...metadata, value: 'shared', lastUpdated: 2 })),
  )
  await writeStarted
  const cacheReads = vi.spyOn(db, 'getLexemesByIds')
  const pulling = store.dispatch(pull([B], { force: true }))
  try {
    expect(getLexeme(store.getState(), 'shared')?.contexts).toEqual([B, A])
    expect((await db.getLexemeById(sharedHash))?.contexts).toEqual([B])

    // Drain runnable work while the write stays blocked. The pull must wait, not read the old cache row.
    await vi.runAllTimersAsync()
    expect(cacheReads).not.toHaveBeenCalled()
  } finally {
    releaseWrite()
  }
  await pulling
  await waitForThoughtspaceIdle()

  expect(cacheReads).toHaveBeenCalledWith([sharedHash])
  expect(getLexeme(store.getState(), 'shared')?.contexts).toEqual([B, A])
  expect((await db.getLexemeById(sharedHash))?.contexts).toEqual([B, A])
})

it('does not let an older in-flight pull undo a CRDT winner with an earlier wall clock', async () => {
  const metadata = { created: 1, lastUpdated: 200, updatedBy: 'sender' }
  await receiver.ops.append(
    await sender.local.insert(
      REPLICA,
      HOME_TOKEN,
      A,
      { type: 'last' },
      encodeThoughtPayload({ ...metadata, value: 'old' }),
    ),
  )
  await waitForThoughtspaceIdle()

  let markRead!: () => void
  let releaseRead!: () => void
  const readStarted = new Promise<void>(resolve => {
    markRead = resolve
  })
  const readReleased = new Promise<void>(resolve => {
    releaseRead = resolve
  })
  const getThoughtsByIds = db.getThoughtsByIds
  vi.spyOn(db, 'getThoughtsByIds').mockImplementationOnce(async ids => {
    const thoughts = await getThoughtsByIds(ids)
    markRead()
    await readReleased
    return thoughts
  })
  const pulling = store.dispatch(pull([A], { force: true }))
  await readStarted
  try {
    await receiver.ops.append(
      await sender.local.payload(REPLICA, A, encodeThoughtPayload({ ...metadata, value: 'new', lastUpdated: 100 })),
    )
    await thoughtspaceRuntime.waitForIdle()
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - new`)
  } finally {
    releaseRead()
  }
  await pulling
  await waitForThoughtspaceIdle()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - new`)
  expect(await db.getLexemeById(hashThought('old'))).toBeUndefined()
  expect((await db.getLexemeById(hashThought('new')))?.contexts).toEqual([A])
})
