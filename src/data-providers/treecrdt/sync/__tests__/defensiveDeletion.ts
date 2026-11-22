import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { initialize } from '../../../../initialize'
import { exportContext } from '../../../../selectors/exportContext'
import store from '../../../../stores/app'
import contextToPathOrThrow from '../../../../test-helpers/contextToPathOrThrow'
import { deleteThoughtAtFirstMatchActionCreator as deleteThought } from '../../../../test-helpers/deleteThoughtAtFirstMatch'
import importToContext from '../../../../test-helpers/importToContext'
import head from '../../../../util/head'
import { thoughtspaceRuntime } from '../../../thoughtspace'
import { tsid } from '../../../thoughtspaceSession'
import { decodeThoughtPayload, encodeThoughtPayload } from '../../payload'

vi.mock(import('@treecrdt/wa-sqlite'), { spy: true })

it('shows a deleted branch again after syncing an unseen child edit', async () => {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })

  const options = { docId: tsid, storage: { type: 'memory' }, runtime: { type: 'direct' } } as const
  const editingClient = await createTreecrdtClient(options)
  onTestFinished(() => editingClient.drop())
  const deletingClient = await createTreecrdtClient(options)

  // Let the app bind its production materialization bridge to the replica whose operations we can exchange below.
  vi.mocked(createTreecrdtClient).mockResolvedValueOnce(deletingClient)
  onTestFinished(async () => {
    await thoughtspaceRuntime.drop()
  })
  const { cleanup } = await initialize({ storage: 'memory' })
  onTestFinished(cleanup)

  store.dispatch(
    importToContext(`
      - Container
        - Parent
          - Child
    `),
  )
  await thoughtspaceRuntime.waitForIdle()

  const childId = head(contextToPathOrThrow(store.getState(), ['Container', 'Parent', 'Child'], 'defensiveDeletion'))
  await editingClient.ops.appendMany(await deletingClient.ops.all())
  const beforeDelete = await deletingClient.meta.headLamport()

  const childPayload = await editingClient.tree.getPayload(childId)
  if (!childPayload) throw new Error('The editing client did not receive the child')
  const edit = await editingClient.local.payload(
    new Uint8Array(32).fill(2),
    childId,
    encodeThoughtPayload({
      ...decodeThoughtPayload(childPayload),
      value: 'Edited child',
      lastUpdated: Date.now(),
      updatedBy: 'editing-client',
    }),
  )

  store.dispatch(deleteThought(['Container', 'Parent']))
  await thoughtspaceRuntime.waitForIdle()
  expect(exportContext(store.getState(), ['Container'], 'text/plain')).toBe('- Container')

  await editingClient.ops.appendMany(await deletingClient.ops.since(beforeDelete))
  await deletingClient.ops.append(edit)
  await thoughtspaceRuntime.waitForIdle()

  expect(exportContext(store.getState(), ['Container'], 'text/plain')).toBe(`- Container
  - Parent
    - Edited child`)
})
