/** Snapshots only. Covers the pinned command ring's geometry and gradients at fixed progress states. The screenshot helper disables filters, so the blur itself is not part of the snapshot. */
import path from 'path'
import configureSnapshots from '../configureSnapshots'
import openModal from '../helpers/openModal'
import screenshot from '../helpers/screenshot'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

it('PinnedCommandRing', async () => {
  await openModal('testPinnedCommandRing')

  expect(await screenshot()).toMatchImageSnapshot()
})
