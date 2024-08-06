import path from 'path'
import sleep from '../../../util/sleep'
import { createImageSnapshotConfig } from '../configureSnapshot'
import helpers from '../helpers'

// Get the full path of the current file
const fullFilePath = __filename

// Extract the file name from the full path
const fileName = path.basename(fullFilePath).replace('.ts', '')

/** Snapshot configurations to extend. */
const toMatchImageSnapshot = createImageSnapshotConfig({ fileName })
expect.extend({ toMatchImageSnapshot })

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/* From jest-image-snapshot README:
    
  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/

const { paste, press, screenshot, remove } = helpers()

/** Removes the huds-up-display (header, footer, etc) so that only the thoughts are shown. */
const removeHUD = async () => {
  await remove('[aria-label="footer"]')
  await remove('[aria-label="menu"]')
  await remove('[aria-label="nav"]')
  await remove('[aria-label="toolbar"]')
}

// Tests the following cases:
// 1. Single line url
// 2. Placeholder with url child
// 3. Multiline url (ellipsized)
// 4. Multiline url (with cursor)
it('url', async () => {
  await removeHUD()

  await paste(`
    - https://test.com/single-line
    -
      - https://github.com/cybersemics/em
    - https://test.com/some/very/very/very/very/very/very/very/very/very/long/url/that/should/definitely/be/ellipsized
    - https://test.com/some/very/very/very/very/very/very/very/very/very/very/long/url/that/should/definitely/be/ellipsized
    - This thought tests the line height of the above multiline url with cursor
  `)

  await press('ArrowUp')

  // wait for render animation to complete
  await sleep(1000)

  const image = await screenshot()
  expect(image).toMatchImageSnapshot()
})
