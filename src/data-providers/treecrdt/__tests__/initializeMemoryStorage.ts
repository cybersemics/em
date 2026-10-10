import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN, SETTINGS_TOKEN } from '../../../constants'
import initializeMemoryStorage from '../initializeMemoryStorage'
import { decodeThoughtPayload, encodeThoughtPayload } from '../payload'

const replicaId = new Uint8Array(32).fill(1)
let client: TreecrdtClient

beforeEach(async () => {
  client = await createTreecrdtClient({ docId: 'initialize-memory-storage' })
})

afterEach(async () => {
  await client.close()
})

it('seeds system roots and Settings without legacy application tables', async () => {
  await initializeMemoryStorage(client, replicaId)

  expect((await client.tree.root.children()).map(node => node.id)).toEqual([HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN])
  expect((await (await client.tree.get(EM_TOKEN))!.children()).map(node => node.id)).toEqual([SETTINGS_TOKEN])
  expect(await (await client.tree.get(HOME_TOKEN))!.children()).toEqual([])
  expect(await (await client.tree.get(ABSOLUTE_TOKEN))!.children()).toEqual([])
  expect(decodeThoughtPayload((await client.tree.root.payload())!)).toEqual({
    value: GLOBAL_ROOT_TOKEN,
    created: 0,
    lastUpdated: 0,
    updatedBy: '',
  })
  expect(decodeThoughtPayload((await (await client.tree.get(SETTINGS_TOKEN))!.payload())!)).toEqual({
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

  expect((await (await client.tree.get(EM_TOKEN))!.children()).map(node => node.id)).toEqual([
    settingsId,
    SETTINGS_TOKEN,
  ])
  expect(decodeThoughtPayload((await (await client.tree.get(settingsId))!.payload())!)).toEqual(settingsPayload)
  expect(decodeThoughtPayload((await (await client.tree.get(SETTINGS_TOKEN))!.payload())!).value).toBe('Settings')
})

it('preserves renamed and moved Settings and its children without authoring operations on reinitialization', async () => {
  await initializeMemoryStorage(client, replicaId)
  const settingsPayload = { value: 'My settings', created: 1, lastUpdated: 2, updatedBy: 'owner' }
  const childId = '2'.repeat(32)
  await client.local.insert(
    replicaId,
    SETTINGS_TOKEN,
    childId,
    { type: 'last' },
    encodeThoughtPayload({ value: 'Tutorial', created: 1, lastUpdated: 2, updatedBy: 'owner' }),
  )
  await client.local.payload(replicaId, SETTINGS_TOKEN, encodeThoughtPayload(settingsPayload))
  await client.local.move(replicaId, SETTINGS_TOKEN, HOME_TOKEN, { type: 'last' })
  const before = await client.tree.dump()
  const operations = await client.ops.all()

  await initializeMemoryStorage(client, replicaId)

  const settings = (await client.tree.get(SETTINGS_TOKEN))!
  expect((await settings.parent())?.id).toBe(HOME_TOKEN)
  expect(decodeThoughtPayload((await settings.payload())!)).toEqual(settingsPayload)
  expect((await settings.children()).map(node => node.id)).toEqual([childId])
  expect(await client.tree.dump()).toEqual(before)
  expect(await client.ops.all()).toEqual(operations)
})
