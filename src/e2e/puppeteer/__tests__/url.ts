import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import hide from '../helpers/hide'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import scroll from '../helpers/scroll'
import waitForFrames from '../helpers/waitForFrames'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/* From jest-image-snapshot README:
    
  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/

// Tests the following cases:
// - Single line url
// - Single line url with cursor
it('single line', async () => {
  await hideHUD()

  await paste(`
    - https://test.com/single-line
    - https://test.com/single-line-with-cursor
    - This thought tests the line height of the above thought
  `)

  // Wait for URL rendering and ellipsization to complete
  // because URL text processing and layout calculations happen asynchronously
  // otherwise screenshot may capture URLs before proper formatting is applied
  await waitForFrames()
  await press('ArrowUp')

  const image = await screenshot()
  expect(image).toMatchImageSnapshot()
})

describe('multiline', () => {
  /** Tests the following cases:
   * - Placeholder with url child.
   * - Multiline url (ellipsized).
   * - Multiline url (with cursor).
   */
  const multilineTest = async () => {
    await hideHUD()

    await paste(`
    - https://test.com/single-line
    - https://test.com/some/very/very/very/very/very/very/very/very/very/very/very/very/very/very/long/url/without-cursor
    - https://test.com/some/very/very/very/very/very/very/very/very/very/very/very/very/very/very/long/url/with-cursor
    - This thought tests the line height of the above thought
  `)

    // Wait for complex multiline URL layout to complete (4 frames for extensive text wrapping)
    // because very long URLs require multiple layout passes for proper line breaking and ellipsization
    // otherwise screenshot may capture URLs with incorrect wrapping or incomplete ellipsis
    await waitForFrames(4)

    await press('ArrowUp')

    // additional frames to ensure stabilization
    await waitForFrames()

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  }

  it('Font Size: 18 (default)', multilineTest)

  it('Font Size: 13', async () => {
    await click('[data-testid=decrease-font]') // 17
    await click('[data-testid=decrease-font]') // 16
    await click('[data-testid=decrease-font]') // 15
    await click('[data-testid=decrease-font]') // 14
    await click('[data-testid=decrease-font]') // 13

    // close alert
    await hide('[data-testid=alert]')

    // scroll to top
    await scroll(0, 0)

    await multilineTest()
  })
})

it('collapsed thought with url child', async () => {
  await hideHUD()

  await paste(`
    - test
      - https://github.com/cybersemics/em
    - 
      - https://github.com/cybersemics/em
  `)

  // Wait for collapsed thought rendering and URL child processing to complete
  // because collapsed states with URL children need time for proper visibility calculations
  // otherwise screenshot may capture inconsistent collapsed/expanded states
  await waitForFrames()
  await press('Escape')

  const image = await screenshot()
  expect(image).toMatchImageSnapshot()
})
