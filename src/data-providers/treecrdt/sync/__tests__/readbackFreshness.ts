import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import ThoughtId from '../../../../@types/ThoughtId'
import { clearActionCreator as clear } from '../../../../actions/clear'
import { updateThoughtsActionCreator as updateThoughts } from '../../../../actions/updateThoughts'
import { initialize } from '../../../../initialize'
import { exportContext } from '../../../../selectors/exportContext'
import store from '../../../../stores/app'
import contextToPathOrThrow from '../../../../test-helpers/contextToPathOrThrow'
import { editThoughtByContextActionCreator as editThought } from '../../../../test-helpers/editThoughtByContext'
import importToContext from '../../../../test-helpers/importToContext'
import createId from '../../../../util/createId'
import head from '../../../../util/head'
import { thoughtspaceRuntime } from '../../../thoughtspace'
import { tsid } from '../../../thoughtspaceSession'
import { encodeThoughtPayload } from '../../payload'

vi.mock(import('@treecrdt/wa-sqlite'), { spy: true })

/** Starts the app on its own client with the given thoughts. Returns that client and another device's, which has them. */
const start = async (text: string) => {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  // Nothing resets Redux between the tests of a file, so start from a clean store with the tutorial skipped.
  store.dispatch([clear(), { type: 'tutorial', value: false }, { type: 'closeModal' }])

  const options = { docId: tsid, storage: { type: 'memory' }, runtime: { type: 'direct' } } as const
  const remoteClient = await createTreecrdtClient(options)
  onTestFinished(() => remoteClient.drop())
  const appClient = await createTreecrdtClient(options)

  vi.mocked(createTreecrdtClient).mockResolvedValueOnce(appClient)
  onTestFinished(async () => {
    await thoughtspaceRuntime.drop()
  })
  const { cleanup } = await initialize({ storage: 'memory' })
  onTestFinished(cleanup)

  store.dispatch(importToContext(text))
  await thoughtspaceRuntime.waitForIdle()
  await remoteClient.ops.appendMany(await appClient.ops.all())
  return { appClient, remoteClient }
}

/** Adds a thought as the last child of a parent on the other device. Returns the op, for the app to receive. */
const insertRemotely = async (remoteClient: TreecrdtClient, parentId: ThoughtId, value: string) => {
  const id = createId() as ThoughtId
  const now = Date.now()
  const op = await remoteClient.local.insert(
    new Uint8Array(32).fill(2),
    parentId,
    id,
    { type: 'last' },
    encodeThoughtPayload({ value, created: now, lastUpdated: now, updatedBy: 'remote-client' }),
  )
  return { id, op }
}

/** Holds formatting on a thought the way formatSelection does. It exists only in Redux, so a stored copy lacks it. */
const holdFormat = (id: ThoughtId, pendingFormat: string) =>
  store.dispatch(
    updateThoughts({
      thoughtIndexUpdates: { [id]: { ...store.getState().thoughts.thoughtIndex[id], pendingFormat } },
      lexemeIndexUpdates: {},
      local: false,
      remote: false,
      overwritePending: true,
    }),
  )

it('publishes a remote child added under a thought that the user renames during the readback', async () => {
  const { appClient, remoteClient } = await start('- Container\n  - X')
  const xId = head(contextToPathOrThrow(store.getState(), ['Container', 'X'], 'readbackFreshness'))
  const { id: yId, op } = await insertRemotely(remoteClient, xId, 'Y')

  // The user renames X while the readback reads X for that insert, so the read misses the rename and must not replace
  // it. The round starts over, waits for the rename's write, and reads X again with Y.
  const read = appClient.tree.read
  let renamed = false
  vi.spyOn(appClient.tree, 'read').mockImplementation(async (ids, opts) => {
    const result = await read(ids, opts)
    if (!renamed && ids.includes(yId)) {
      renamed = true
      store.dispatch(editThought(['Container', 'X'], 'X2'))
    }
    return result
  })
  await appClient.ops.append(op)
  await thoughtspaceRuntime.waitForIdle()

  expect(renamed).toBe(true)
  expect(exportContext(store.getState(), ['Container'], 'text/plain')).toBe(`- Container
  - X2
    - Y`)
})

it('keeps the fields that exist only in Redux when a remote change reads their thought again', async () => {
  const { appClient, remoteClient } = await start('- Container\n  - X')
  const [containerId, xId] = contextToPathOrThrow(store.getState(), ['Container', 'X'], 'readbackFreshness')
  holdFormat(xId, '<b></b>')

  // Another device adds Y after X, so the readback reads X again as a sibling of Y.
  const { op } = await insertRemotely(remoteClient, containerId, 'Y')
  await appClient.ops.append(op)
  await thoughtspaceRuntime.waitForIdle()

  expect(exportContext(store.getState(), ['Container'], 'text/plain')).toBe(`- Container
  - X
  - Y`)
  expect(store.getState().thoughts.thoughtIndex[xId].pendingFormat).toBe('<b></b>')
})
