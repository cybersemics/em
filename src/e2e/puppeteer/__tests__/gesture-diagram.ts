import path from 'path'
import configureSnapshots from '../configureSnapshots'
import openModal from '../helpers/openModal'
import screenshot from '../helpers/screenshot-with-no-antialiasing'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/* From jest-image-snapshot README:

  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/

it('GestureDiagram', async () => {
  await openModal('testGestureDiagram')

  const image = await screenshot()
  expect(image).toMatchImageSnapshot()
})
