/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

/* Visual regression tests
 * Snapshot Directory: ./__image_snapshots__
 * See: https://github.com/americanexpress/jest-image-snapshot
 */
import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import { delay } from '../../../test-helpers/delay'
import helpers from '../helpers'

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  customDiffConfig: {
    // per-pixel failure threshold (percent)
    // puppeteer anti-aliasing (?) commonly creates small differences in text and svg rendering at different font sizes, so increase the threshold
    threshold: 0.1,
  },
  // full picture failure threshold (pixels)
  failureThreshold: 10,
})
expect.extend({ toMatchImageSnapshot })

jest.setTimeout(30000)

/*
From jest-image-snapshot README:

  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/
// jest.retryTimes(3)

const { click, paste, press, screenshot, scroll, type, waitForState } = helpers()

/** Set up the snapshot tests. These are defined in a function so they can be run at different font sizes (via adjusting the font size in beforeEach). */
const testSuite = () => {
  it('no thoughts', async () => {
    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('one thought', async () => {
    await press('Enter')
    await type('a')

    // wait for HUD to fade out after typing
    await delay(2000)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('subthought', async () => {
    await paste(`
      - a
        - b
      `)

    // wait for toolbar highlight animations to complete
    await delay(400)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('deeply nested', async () => {
    await paste(`
      - a
        - b
          - c
            - d
              - e
                - f
      - g
    `)

    press('ArrowUp')

    // wait for toolbar highlight animations to complete
    await delay(400)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('collapsed subthought', async () => {
    await paste(`
      - a
        - b
      - c
      `)

    // wait for toolbar highlight animations to complete
    await delay(400)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('multiline thought', async () => {
    await paste(`
      - a
      - Time is nothing other than the form of inner sense, i.e. the intuition of our self and our inner state.
      - b
      - c
    `)

    // wait for toolbar highlight animations to complete
    await delay(400)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('multiline thought with children', async () => {
    await paste(`
      - a
      - Time is nothing other than the form of inner sense, i.e. the intuition of our self and our inner state.
        - b
        - c
        - d
      - e
      - f
    `)

    // move cursor to the multiline thought
    await press('ArrowUp')
    await press('ArrowUp')

    // wait for toolbar highlight animations to complete
    await delay(400)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })
}

describe('Font Size: 18 (default)', () => {
  beforeEach(async () => {
    await waitForState('isPushing', false)

    // TODO: identify what needs to be waited for specifically
    await delay(1000)
  })

  // run the snapshot tests at font size 18 (default)
  testSuite()
})

describe('Font Size: 14', () => {
  beforeEach(async () => {
    await waitForState('isPushing', false)

    // TODO: identify what needs to be waited for specifically
    await delay(1000)

    await click('.decrease-font') // 17
    await click('.decrease-font') // 16
    await click('.decrease-font') // 15
    await click('.decrease-font') // 14

    // close alert
    await click('.status-close-x')

    // scroll to top
    await scroll(0, 0)

    // wait for toolbar size transitions to complete
    await delay(400)
  })

  // run the snapshot tests at font size 14
  testSuite()
})

describe('Font Size: 22', () => {
  beforeEach(async () => {
    await waitForState('isPushing', false)

    // TODO: identify what needs to be waited for specifically
    await delay(1000)

    await click('.increase-font') // 19
    await click('.increase-font') // 20
    await click('.increase-font') // 21
    await click('.increase-font') // 22

    // close alert
    await click('.status-close-x')

    // scroll to top
    await scroll(0, 0)

    // wait for toolbar size transitions to complete
    await delay(400)
  })

  // run the snapshot tests at font size 22
  testSuite()
})
