import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../../constants'
import hashThought from '../../../util/hashThought'
import type { DataProvider } from '../../DataProvider'
import createTreecrdtThoughtspace from '../runtime'
import createTreecrdtDataProvider, { createIndexedChildrenMap } from '../thoughtspace'

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
    await createTreecrdtDataProvider().bindClient(client, replicaId)
    const operations = await client.ops.all()
    await createTreecrdtDataProvider().bindClient(client, replicaId)
    await expect(client.ops.all()).resolves.toEqual(operations)
  } finally {
    await client.drop()
  }
})

it('preserves requested order, duplicates, and missing entries when reading persisted thoughts and lexemes', async () => {
  await initTestThoughtspace()
  await treecrdtThoughtspace.updateThoughts({
    thoughtIndexUpdates: { [PARENT_ID]: thought(PARENT_ID, EM_TOKEN, 'parent', 0) },
  })

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

it('uses indexed attribute values as childrenMap keys without changing TreeCRDT node ids', async () => {
  const valueById = {
    [PIN_ID]: '=pin',
    [PIN_DUPLICATE_ID]: '=pin',
  }

  const childrenMap = createIndexedChildrenMap([PIN_ID, PIN_DUPLICATE_ID, FALSE_ID], valueById)

  expect(childrenMap['=pin']).toBe(PIN_ID)
  expect(childrenMap[PIN_DUPLICATE_ID]).toBe(PIN_DUPLICATE_ID)
  expect(childrenMap[FALSE_ID]).toBe(FALSE_ID)
  expect(childrenMap.false).toBeUndefined()
  expect(Object.values(childrenMap)).toEqual([PIN_ID, PIN_DUPLICATE_ID, FALSE_ID])
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
    const nodeSpy = vi.spyOn(client.tree, 'node')

    await persistThoughtsTo(
      provider.db,
      childIds.map((id, index) => thought(id, PARENT_ID, `child-${index}`, index + 0.5)),
    )

    // Each sibling-order read goes through the parent's node.
    expect(nodeSpy.mock.calls.filter(([id]) => id === PARENT_ID)).toHaveLength(childIds.length)
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

it('rebuilds memberships and keeps favorite order when opening a database indexed by an older version', async () => {
  const client = await createTreecrdtClient({ docId: 'older-index-version' })
  const replicaId = new Uint8Array(32).fill(1)
  const provider = createTreecrdtDataProvider()
  const close = await provider.bindClient(client, replicaId)
  try {
    await persistThoughtsTo(provider.db, [
      thought(THOUGHT_A_ID, EM_TOKEN, 'a', 0),
      thought(THOUGHT_B_ID, EM_TOKEN, '=favorite', 1),
      thought(THOUGHT_Y_ID, EM_TOKEN, '=favorite', 2),
    ])
    // Differs from the default order (created, then id), so losing the saved order would show.
    await provider.db.updateThoughts({ thoughtIndexUpdates: {}, favoriteOrder: [THOUGHT_B_ID, THOUGHT_Y_ID] })
    await close()
    // Model a database indexed by an older version: a version-1 cursor and no memberships table.
    await client.runner.exec(`
      DROP TABLE em_lexeme_memberships;
      UPDATE em_derived_indexes_meta SET version = 1;
    `)
    const operations = await client.ops.all()
    const reopened = createTreecrdtDataProvider()
    const closeReopened = await reopened.bindClient(client, replicaId)
    try {
      await expect(reopened.db.getLexemeById(hashThought('a'))).resolves.toMatchObject({ contexts: [THOUGHT_A_ID] })
      await expect(reopened.db.getLexemeById(hashThought('=favorite'))).resolves.toMatchObject({
        contexts: [THOUGHT_B_ID, THOUGHT_Y_ID],
      })
      // Rebuilding a local index must not rewrite the replicated data.
      await expect(client.ops.all()).resolves.toEqual(operations)
    } finally {
      await closeReopened()
    }
  } finally {
    await close()
    await client.drop()
  }
})

it('keeps favorite order independent of membership changes and preserves it when reopening', async () => {
  const client = await createTreecrdtClient({ docId: 'favorite-order' })
  const replicaId = new Uint8Array(32).fill(1)
  const provider = createTreecrdtDataProvider()
  const close = await provider.bindClient(client, replicaId)
  try {
    await persistThoughtsTo(provider.db, [
      thought(THOUGHT_A_ID, EM_TOKEN, '=favorite', 0),
      thought(THOUGHT_B_ID, EM_TOKEN, '=favorite', 1),
    ])
    await provider.db.updateThoughts({
      thoughtIndexUpdates: {},
      favoriteOrder: [THOUGHT_B_ID, THOUGHT_A_ID, PARENT_ID],
    })
    await persistThoughtsTo(provider.db, [thought(THOUGHT_Y_ID, EM_TOKEN, '=favorite', 2)])
    await expect(provider.db.getLexemeById(hashThought('=favorite'))).resolves.toMatchObject({
      contexts: [THOUGHT_B_ID, THOUGHT_A_ID, THOUGHT_Y_ID],
    })
    await persistThoughtsTo(provider.db, [thought(THOUGHT_B_ID, EM_TOKEN, 'not a favorite', 1)])
    await expect(provider.db.getLexemeById(hashThought('=favorite'))).resolves.toMatchObject({
      contexts: [THOUGHT_A_ID, THOUGHT_Y_ID],
    })
    await persistThoughtsTo(provider.db, [thought(THOUGHT_B_ID, EM_TOKEN, '=favorite', 1)])
    await close()
    const reopened = createTreecrdtDataProvider()
    const closeReopened = await reopened.bindClient(client, replicaId)
    try {
      await expect(reopened.db.getLexemeById(hashThought('=favorite'))).resolves.toMatchObject({
        contexts: [THOUGHT_B_ID, THOUGHT_A_ID, THOUGHT_Y_ID],
      })
    } finally {
      await closeReopened()
    }
  } finally {
    await close()
    await client.drop()
  }
})

it('resumes from its cursor after an interrupted index update', async () => {
  const client = await createTreecrdtClient({ docId: 'partial-index-update' })
  const replicaId = new Uint8Array(32).fill(1)
  const provider = createTreecrdtDataProvider()
  const close = await provider.bindClient(client, replicaId)
  const getText = client.runner.getText.bind(client.runner)
  const exec = client.runner.exec.bind(client.runner)
  const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const runner = vi.spyOn(client.runner, 'exec').mockImplementation(sql => {
    if (sql.includes('INSERT INTO em_attribute_children')) throw new Error('interrupted index update')
    return exec(sql)
  })
  try {
    const cursor = await getText('SELECT head_seq FROM em_derived_indexes_meta')
    // The write still succeeds; the failed update only leaves the cursor where it was.
    await persistThoughtsTo(provider.db, [thought(PIN_ID, EM_TOKEN, '=pin', 0)])
    expect(await getText('SELECT head_seq FROM em_derived_indexes_meta')).toBe(cursor)
    runner.mockRestore()
    await close()

    const reopened = createTreecrdtDataProvider()
    const closeReopened = await reopened.bindClient(client, replicaId)
    try {
      await expect(reopened.db.getLexemeById(hashThought('=pin'))).resolves.toMatchObject({ contexts: [PIN_ID] })
      expect((await reopened.db.getThoughtById(EM_TOKEN))?.childrenMap['=pin']).toBe(PIN_ID)
      const { headSeq } = await client.tree.changedSince(0, { limit: 1 })
      expect(await getText('SELECT head_seq FROM em_derived_indexes_meta')).toBe(String(headSeq))
    } finally {
      await closeReopened()
    }
  } finally {
    runner.mockRestore()
    await close()
    await client.drop()
    report.mockRestore()
  }
})
