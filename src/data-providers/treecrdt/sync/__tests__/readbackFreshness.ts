import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import ThoughtId from '../../../../@types/ThoughtId'
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

it('reads a thought again after a remote change to it arrives while its local edit is unconfirmed', async () => {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })

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

  store.dispatch(importToContext('- Container\n  - X'))
  await thoughtspaceRuntime.waitForIdle()
  const xId = head(contextToPathOrThrow(store.getState(), ['Container', 'X'], 'readbackFreshness'))

  // Another device adds Y under X.
  await remoteClient.ops.appendMany(await appClient.ops.all())
  const yId = createId() as ThoughtId
  const now = Date.now()
  const insert = await remoteClient.local.insert(
    new Uint8Array(32).fill(2),
    xId,
    yId,
    { type: 'last' },
    encodeThoughtPayload({ value: 'Y', created: now, lastUpdated: now, updatedBy: 'remote-client' }),
  )

  // The user renames X while the readback reads X for that insert, so the read misses the rename and must not replace
  // it. Once the rename is written, the readback reads X again and takes Y with it.
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
  await appClient.ops.append(insert)
  await thoughtspaceRuntime.waitForIdle()

  expect(renamed).toBe(true)
  expect(exportContext(store.getState(), ['Container'], 'text/plain')).toBe(`- Container
  - X2
    - Y`)
})
