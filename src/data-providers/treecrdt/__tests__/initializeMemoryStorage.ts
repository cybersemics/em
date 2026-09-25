import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN, SETTINGS_TOKEN } from '../../../constants'
import initializeMemoryStorage from '../initializeMemoryStorage'
import { decodeThoughtPayload, encodeThoughtPayload } from '../payload'

const replicaId = new Uint8Array(32).fill(1)
let client: TreecrdtClient

beforeEach(async () => {
  client = await createTreecrdtClient({ storage: { type: 'memory' }, runtime: { type: 'direct' } })
})

afterEach(async () => {
  await client.close()
})

it('seeds system roots and Settings without legacy application tables', async () => {
  await initializeMemoryStorage(client, replicaId)

  expect(await client.tree.children(GLOBAL_ROOT_TOKEN)).toEqual([HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN])
  expect(await client.tree.children(EM_TOKEN)).toEqual([SETTINGS_TOKEN])
  expect(await client.tree.children(HOME_TOKEN)).toEqual([])
  expect(await client.tree.children(ABSOLUTE_TOKEN)).toEqual([])
  expect(decodeThoughtPayload((await client.tree.getPayload(GLOBAL_ROOT_TOKEN))!)).toEqual({
    value: GLOBAL_ROOT_TOKEN,
    created: 0,
    lastUpdated: 0,
    updatedBy: '',
  })
  expect(decodeThoughtPayload((await client.tree.getPayload(SETTINGS_TOKEN))!)).toEqual({
    value: 'Settings',
    created: expect.any(Number),
    lastUpdated: expect.any(Number),
    updatedBy: '',
  })
  expect(
    await client.runner.getText(
      "SELECT json_group_array(name) FROM sqlite_master WHERE type = 'table' AND name IN ('em_lexemes', 'em_attribute_children')",
    ),
  ).toBe('[]')
})

it('seeds canonical Settings independently of an unrelated thought with the same label', async () => {
  const settingsId = '1'.repeat(32)
  const settingsPayload = { value: 'Settings', created: 1, lastUpdated: 2, updatedBy: 'owner' }
  await client.local.insert(
    replicaId,
    GLOBAL_ROOT_TOKEN,
    EM_TOKEN,
    { type: 'last' },
    encodeThoughtPayload({ value: EM_TOKEN, created: 1, lastUpdated: 1, updatedBy: 'owner' }),
  )
  await client.local.insert(replicaId, EM_TOKEN, settingsId, { type: 'last' }, encodeThoughtPayload(settingsPayload))

  await initializeMemoryStorage(client, replicaId)

  expect(await client.tree.children(EM_TOKEN)).toEqual([settingsId, SETTINGS_TOKEN])
  expect(decodeThoughtPayload((await client.tree.getPayload(settingsId))!)).toEqual(settingsPayload)
  expect(decodeThoughtPayload((await client.tree.getPayload(SETTINGS_TOKEN))!).value).toBe('Settings')
})

it('preserves a renamed canonical Settings thought under the EM root', async () => {
  const settingsPayload = {
    value: 'My settings',
    created: 1,
    lastUpdated: 2,
    updatedBy: 'owner',
  }
  await client.local.insert(
    replicaId,
    GLOBAL_ROOT_TOKEN,
    EM_TOKEN,
    { type: 'last' },
    encodeThoughtPayload({ value: EM_TOKEN, created: 1, lastUpdated: 1, updatedBy: 'owner' }),
  )
  await client.local.insert(
    replicaId,
    EM_TOKEN,
    SETTINGS_TOKEN,
    { type: 'last' },
    encodeThoughtPayload(settingsPayload),
  )

  await initializeMemoryStorage(client, replicaId)

  expect(await client.tree.children(EM_TOKEN)).toEqual([SETTINGS_TOKEN])
  expect(decodeThoughtPayload((await client.tree.getPayload(SETTINGS_TOKEN))!)).toEqual(settingsPayload)
})

it('does not author operations when initialization is repeated', async () => {
  await initializeMemoryStorage(client, replicaId)
  const childId = '2'.repeat(32)
  await client.local.insert(
    replicaId,
    SETTINGS_TOKEN,
    childId,
    { type: 'last' },
    encodeThoughtPayload({ value: 'Tutorial', created: 1, lastUpdated: 2, updatedBy: 'owner' }),
  )
  const before = await client.tree.dump()
  const operations = await client.ops.since(0)

  await initializeMemoryStorage(client, replicaId)

  expect(await client.tree.dump()).toEqual(before)
  expect(await client.ops.since(0)).toEqual(operations)
  expect(await client.tree.children(SETTINGS_TOKEN)).toEqual([childId])
})

it('preserves an existing canonical Settings thought after it is renamed and moved', async () => {
  await initializeMemoryStorage(client, replicaId)
  const settingsPayload = { value: 'My settings', created: 1, lastUpdated: 2, updatedBy: 'owner' }
  await client.local.payload(replicaId, SETTINGS_TOKEN, encodeThoughtPayload(settingsPayload))
  await client.local.move(replicaId, SETTINGS_TOKEN, HOME_TOKEN, { type: 'last' })
  const operations = await client.ops.all()

  await initializeMemoryStorage(client, replicaId)

  expect(await client.tree.parent(SETTINGS_TOKEN)).toBe(HOME_TOKEN)
  expect(decodeThoughtPayload((await client.tree.getPayload(SETTINGS_TOKEN))!)).toEqual(settingsPayload)
  expect(await client.ops.all()).toEqual(operations)
})
