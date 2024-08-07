import path from 'path'
import sleep from '../../../util/sleep'
import { createImageSnapshotConfig } from '../configureSnapshot'
import helpers from '../helpers'

// Get the full path of the current file
const fullFilePath = __filename

// Extract the file name from the full path
const fileName = path.basename(fullFilePath).replace('.ts', '')

const toMatchImageSnapshot = createImageSnapshotConfig({ fileName })
expect.extend({ toMatchImageSnapshot })

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/* From jest-image-snapshot README:

  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/

const { openModal, screenshot } = helpers()

it('GestureDiagram', async () => {
  await openModal('testGestureDiagram')

  // wait for modal to fade in
  await sleep(400)

  const image = await screenshot()
  expect(image).toMatchImageSnapshot()
})
