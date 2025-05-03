import path from 'path'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import hide from '../helpers/hide'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import scroll from '../helpers/scroll'

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

  await press('ArrowUp')

  const image = await screenshot()
  expect(image).toMatchImageSnapshot({
    customDiffConfig: {
      // Fails intermittently in the CI with default threshold of 0.18.
      // See: https://github.com/cybersemics/em/actions/runs/12318388366/job/34418086296?pr=2700
      threshold: 0.4,
    },
  })
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

    await press('ArrowUp')

    // TODO: Test intermittently fails
    // e.g. https://github.com/cybersemics/em/actions/runs/13817648331/job/38654935147?pr=2800
    await sleep(200)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot({
      customDiffConfig: {
        // Fails intermittently in the CI with default threshold of 0.18.
        // See: https://github.com/cybersemics/em/actions/runs/12318388366/job/34418086296?pr=2700
        threshold: 0.4,
      },
    })
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

  await press('Escape')

  const image = await screenshot()
  expect(image).toMatchImageSnapshot()
})
