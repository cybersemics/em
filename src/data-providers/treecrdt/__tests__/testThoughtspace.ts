import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../../constants'
import hashThought from '../../../util/hashThought'
import type { DataProvider } from '../../DataProvider'
import { encodeThoughtPayload } from '../payload'
import createTreecrdtThoughtspace from '../runtime'
import createTreecrdtDataProvider from '../thoughtspace'

/** Initializes an isolated in-memory TreeCRDT client and thoughtspace for unit tests. */
const treecrdt = createTreecrdtThoughtspace()
const treecrdtThoughtspace = treecrdt.db

/** Initializes the bound in-memory test runtime. */
const initTestThoughtspace = async (): Promise<void> => {
  await treecrdt.init({ storage: 'memory' })
}

const PIN_ID = '00000000000000000000000000000101' as ThoughtId
const FALSE_ID = '00000000000000000000000000000102' as ThoughtId
const PIN_DUPLICATE_ID = '00000000000000000000000000000103' as ThoughtId
const PARENT_ID = '00000000000000000000000000000110' as ThoughtId
const OTHER_PARENT_ID = '00000000000000000000000000000111' as ThoughtId
const THOUGHT_A_ID = '00000000000000000000000000000112' as ThoughtId
const THOUGHT_Y_ID = '00000000000000000000000000000113' as ThoughtId
const THOUGHT_B_ID = '00000000000000000000000000000114' as ThoughtId
const THOUGHT_X_ID = '00000000000000000000000000000115' as ThoughtId

/** Creates a minimal thought fixture for provider-level ordering tests. */
const thought = (id: ThoughtId, parentId: ThoughtId, value: string, rank: number) => ({
  id,
  parentId,
  value,
  rank,
  childrenMap: {},
  created: 1 as Timestamp,
  lastUpdated: 1 as Timestamp,
  updatedBy: 'test',
})

/** Persists thoughts through the real TreeCRDT data provider. */
const persistThoughtsTo = (
  db: Pick<DataProvider, 'updateThoughts'>,
  thoughts: ReturnType<typeof thought>[],
  movePlacements?: Record<ThoughtId, ThoughtId | null>,
) =>
  db.updateThoughts({
    thoughtIndexUpdates: Object.fromEntries(thoughts.map(thought => [thought.id, thought])),
    movePlacements,
  })

/** Persists thoughts through the shared test thoughtspace. */
const persistThoughts = (
  thoughts: ReturnType<typeof thought>[],
  movePlacements?: Record<ThoughtId, ThoughtId | null>,
) => persistThoughtsTo(treecrdtThoughtspace, thoughts, movePlacements)

afterEach(async () => {
  await treecrdt.drop()
})

it('seeds fixed system thoughts in the TreeCRDT provider', async () => {
  await initTestThoughtspace()

  const em = await treecrdtThoughtspace.getThoughtById(EM_TOKEN)
  expect(em?.childrenMap[SETTINGS_TOKEN]).toBe(SETTINGS_TOKEN)

  const settings = await treecrdtThoughtspace.getThoughtById(SETTINGS_TOKEN)
  expect(settings).toMatchObject({
    id: SETTINGS_TOKEN,
    parentId: EM_TOKEN,
    value: SETTINGS_VALUE,
  })

  const settingsLexeme = await treecrdtThoughtspace.getLexemeById(hashThought(SETTINGS_VALUE))
  expect(settingsLexeme?.contexts).toEqual([SETTINGS_TOKEN])
})

it('does not write seed operations again when binding a seeded client', async () => {
  const client = await createTreecrdtClient({ docId: 'seeded-client' })
  const replicaId = new Uint8Array(32).fill(1)
  try {
    const close = await createTreecrdtDataProvider().bindClient(client, replicaId)
    const operations = await client.ops.all()
    await close()
    await createTreecrdtDataProvider().bindClient(client, replicaId)
    await expect(client.ops.all()).resolves.toEqual(operations)
  } finally {
    await client.drop()
  }
})

it('preserves requested order, duplicates, and missing entries when reading persisted thoughts and lexemes', async () => {
  await initTestThoughtspace()
  await persistThoughts([thought(PARENT_ID, EM_TOKEN, 'parent', 0)])

  await expect(treecrdtThoughtspace.getThoughtById(OTHER_PARENT_ID)).resolves.toBeUndefined()
  await expect(treecrdtThoughtspace.getLexemeById(hashThought('missing'))).resolves.toBeUndefined()

  const thoughts = await treecrdtThoughtspace.getThoughtsByIds([PARENT_ID, OTHER_PARENT_ID, SETTINGS_TOKEN, PARENT_ID])
  expect(thoughts.map(thought => thought?.id)).toEqual([PARENT_ID, undefined, SETTINGS_TOKEN, PARENT_ID])

  const lexemes = await treecrdtThoughtspace.getLexemesByIds(
    ['parent', 'missing', SETTINGS_VALUE, 'parent'].map(hashThought),
  )
  expect(lexemes.map(lexeme => lexeme?.contexts)).toEqual([[PARENT_ID], undefined, [SETTINGS_TOKEN], [PARENT_ID]])
})

it('does not delete persisted lexemes when freeing cache', async () => {
  await initTestThoughtspace()

  const settingsKey = hashThought(SETTINGS_VALUE)
  await treecrdtThoughtspace.freeLexeme(settingsKey)

  const settingsLexeme = await treecrdtThoughtspace.getLexemeById(settingsKey)
  expect(settingsLexeme?.contexts).toEqual([SETTINGS_TOKEN])
})

it('does not require an initialized TreeCRDT client when freeing lexeme cache', async () => {
  await expect(treecrdtThoughtspace.freeLexeme(hashThought('missing'))).resolves.toBeUndefined()
})

it('keys an attribute under its new parent and drops the key once it is renamed', async () => {
  await initTestThoughtspace()
  await persistThoughts([thought(PARENT_ID, EM_TOKEN, 'parent', 0), thought(OTHER_PARENT_ID, EM_TOKEN, 'other', 1)])
  await persistThoughts([
    thought(PIN_ID, PARENT_ID, '=pin', 0),
    thought(PIN_DUPLICATE_ID, PARENT_ID, '=pin', 1),
    thought(FALSE_ID, PARENT_ID, 'false', 2),
  ])

  const parent = await treecrdtThoughtspace.getThoughtById(PARENT_ID)
  expect(Object.entries(parent?.childrenMap ?? {})).toEqual([
    ['=pin', PIN_ID],
    [PIN_DUPLICATE_ID, PIN_DUPLICATE_ID],
    [FALSE_ID, FALSE_ID],
  ])

  await persistThoughts([thought(PIN_ID, OTHER_PARENT_ID, '=pin', 0)], { [PIN_ID]: null })
  expect((await treecrdtThoughtspace.getThoughtById(OTHER_PARENT_ID))?.childrenMap['=pin']).toBe(PIN_ID)

  await persistThoughts([thought(PIN_ID, OTHER_PARENT_ID, 'pin', 0)])
  expect((await treecrdtThoughtspace.getThoughtById(OTHER_PARENT_ID))?.childrenMap['=pin']).toBeUndefined()
})

it('falls back to rank placement when explicit afterId is stale', async () => {
  await initTestThoughtspace()

  await persistThoughts([thought(PARENT_ID, EM_TOKEN, 'parent', 0), thought(OTHER_PARENT_ID, EM_TOKEN, 'other', 1)])
  await persistThoughts([thought(THOUGHT_A_ID, PARENT_ID, 'a', 0)])
  await persistThoughts([thought(THOUGHT_Y_ID, PARENT_ID, 'y', 1)])
  await persistThoughts([thought(THOUGHT_B_ID, PARENT_ID, 'b', 2)])
  await persistThoughts([thought(THOUGHT_X_ID, PARENT_ID, 'x', 3)])

  await persistThoughts([thought(THOUGHT_Y_ID, OTHER_PARENT_ID, 'y', 0)], {
    [THOUGHT_Y_ID]: null,
  })

  await expect(
    persistThoughts([thought(THOUGHT_X_ID, PARENT_ID, 'x', 1)], {
      [THOUGHT_X_ID]: THOUGHT_Y_ID,
    }),
  ).resolves.toBeDefined()

  const parent = await treecrdtThoughtspace.getThoughtById(PARENT_ID)
  expect(Object.values(parent?.childrenMap ?? {})).toEqual([THOUGHT_A_ID, THOUGHT_X_ID, THOUGHT_B_ID])
})

it('excludes the moving thought from stale rank placement', async () => {
  await initTestThoughtspace()

  await persistThoughts([thought(PARENT_ID, EM_TOKEN, 'parent', 0), thought(OTHER_PARENT_ID, EM_TOKEN, 'other', 1)])
  await persistThoughts([thought(THOUGHT_X_ID, PARENT_ID, 'x', 0)])
  await persistThoughts([thought(THOUGHT_Y_ID, PARENT_ID, 'y', 1)])
  await persistThoughts([thought(THOUGHT_A_ID, PARENT_ID, 'a', 2)])

  await persistThoughts([thought(THOUGHT_Y_ID, OTHER_PARENT_ID, 'y', 0)], {
    [THOUGHT_Y_ID]: null,
  })

  await expect(
    persistThoughts([thought(THOUGHT_X_ID, PARENT_ID, 'x', 1)], {
      [THOUGHT_X_ID]: THOUGHT_Y_ID,
    }),
  ).resolves.toBeDefined()

  const parent = await treecrdtThoughtspace.getThoughtById(PARENT_ID)
  expect(Object.values(parent?.childrenMap ?? {})).toEqual([THOUGHT_X_ID, THOUGHT_A_ID])
})

// https://github.com/cybersemics/em/pull/4325#issuecomment-5248342036
it('reads sibling order once per thought when inserting a wide batch', async () => {
  const client = await createTreecrdtClient({ docId: 'wide-batch' })
  const provider = createTreecrdtDataProvider()

  try {
    await provider.bindClient(client, new Uint8Array(32).fill(1))
    await persistThoughtsTo(provider.db, [thought(PARENT_ID, EM_TOKEN, 'parent', 0)])

    const childIds = Array.from({ length: 40 }, (_, index) => (index + 512).toString(16).padStart(32, '0') as ThoughtId)
    const read = vi.spyOn(client.tree, 'read')

    await persistThoughtsTo(
      provider.db,
      childIds.map((id, index) => thought(id, PARENT_ID, `child-${index}`, index + 0.5)),
    )

    expect(read).toHaveBeenCalledTimes(childIds.length)
    const children = await client.tree.node(PARENT_ID).children()
    expect(children.map(child => child.id)).toEqual(childIds)
  } finally {
    await client.drop()
  }
})

it('queues writes issued before initialization and applies them to the bound client', async () => {
  let writeSettled = false
  const write = persistThoughts([thought(PARENT_ID, EM_TOKEN, 'queued', 0)]).finally(() => {
    writeSettled = true
  })

  await Promise.resolve()
  expect(writeSettled).toBe(false)

  await initTestThoughtspace()
  await expect(write).resolves.toBeDefined()
  await expect(treecrdtThoughtspace.getThoughtById(PARENT_ID)).resolves.toMatchObject({ value: 'queued' })
})

it('keeps separately created thoughtspace instances isolated', async () => {
  const first = createTreecrdtThoughtspace()
  const second = createTreecrdtThoughtspace()

  try {
    await first.init({ storage: 'memory' })
    await second.init({ storage: 'memory' })

    await persistThoughtsTo(first.db, [thought(PARENT_ID, EM_TOKEN, 'first', 0)])
    await persistThoughtsTo(second.db, [thought(PARENT_ID, EM_TOKEN, 'second', 0)])

    await expect(first.db.getThoughtById(PARENT_ID)).resolves.toMatchObject({ value: 'first' })
    await expect(second.db.getThoughtById(PARENT_ID)).resolves.toMatchObject({ value: 'second' })
  } finally {
    await first.drop()
    await second.drop()
  }
})

it('derives memberships from existing thoughts and preserves the saved order of live favorites on upgrade', async () => {
  const client = await createTreecrdtClient({ docId: 'upgrade-favorites' })
  const replicaId = new Uint8Array(32).fill(1)
  try {
    const older = await client.onMaterializedDurable('em-derived-indexes', () => undefined, { version: 1 })
    const payload = encodeThoughtPayload({ value: '=favorite', created: 1, lastUpdated: 1, updatedBy: 'test' })
    await client.local.insert(replicaId, client.tree.root.id, THOUGHT_B_ID, { type: 'last' }, payload)
    await client.local.insert(replicaId, client.tree.root.id, THOUGHT_Y_ID, { type: 'last' }, payload)
    await older.close()
    // The old cache contains a stale member and explicitly orders B before Y (the reverse of their id order).
    await client.runner.exec('CREATE TABLE em_lexemes (id TEXT PRIMARY KEY, payload_json TEXT NOT NULL)')
    await client.runner.run('INSERT INTO em_lexemes VALUES (?1, ?2)', [
      hashThought('=favorite'),
      JSON.stringify({
        contexts: [THOUGHT_B_ID, THOUGHT_X_ID, THOUGHT_Y_ID],
        created: 1,
        lastUpdated: 1,
        updatedBy: 'test',
      }),
    ])

    const provider = createTreecrdtDataProvider()
    const close = await provider.bindClient(client, replicaId)
    await expect(provider.db.getLexemeById(hashThought('=favorite'))).resolves.toMatchObject({
      contexts: [THOUGHT_B_ID, THOUGHT_Y_ID],
    })
    await close()
  } finally {
    await client.drop()
  }
})
