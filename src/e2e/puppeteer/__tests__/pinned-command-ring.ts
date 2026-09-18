/** Snapshots only. Covers the pinned command ring's geometry, gradients, blur, and shadows at fixed progress states, including a supplied colorful state. */
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

  expect(await screenshot({ preserveFilters: true })).toMatchImageSnapshot()
})
