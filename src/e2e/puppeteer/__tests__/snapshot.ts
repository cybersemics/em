/* Visual regression tests
 * Snapshot Directory: ./__image_snapshots__
 * Run `jest -u` to update failed snapshots.
 * Press i in jest watch to update failing snapshots interactively.
 * See: https://github.com/americanexpress/jest-image-snapshot
 */
import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import sleep from '../../../util/sleep'
import helpers from '../helpers'

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  /** Apply a Gaussian Blur on compared images (radius in pixels). Used to normalize small rendering differences between platforms. */
  // blur of 1.25 and threshold of 0.2 has false negatives
  // blur of 2 and threshold of 0.1 has false negatives
  // blur of 2.5 and threshold of 0.1 has false negatives
  // blur of 1.5 and threshold of 0.175 has NO false negatives (false positives untested)
  blur: 1.5,
  customDiffConfig: {
    // per-pixel failure threshold (percent)
    // puppeteer anti-aliasing (?) commonly creates small differences in text and svg rendering at different font sizes, so increase the threshold
    threshold: 0.2,
  },
  // Full picture failure threshold (pixels)
  // 4 pixels definitely has false positives.
  // 14 px definitely has false negatives.
  // Hopefully 8 is the sweet spot.
  failureThreshold: 8,
})
expect.extend({ toMatchImageSnapshot })

vi.setConfig({ testTimeout: 60000 })

/*
From jest-image-snapshot README:

  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/
// jest.retryTimes(3)

const { click, paste, press, remove, screenshot, scroll, type } = helpers()

/** Removes the huds-up-display (header, footer, etc) so that only the thoughts are shown. */
const removeHUD = async () => {
  await remove('[aria-label="footer"]')
  await remove('[aria-label="menu"]')
  await remove('[aria-label="nav"]')
  await remove('[aria-label="toolbar"]')
}

/** Set up the snapshot tests. These are defined in a function so they can be run at different font sizes (via adjusting the font size in beforeEach). */
const testSuite = () => {
  describe('', () => {
    it('initial load', async () => {
      await sleep(1000)
      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })
  })

  describe('', () => {
    beforeEach(removeHUD)

    it('one thought', async () => {
      await press('Enter')
      await type('a')
      await sleep(1000)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('subthought', async () => {
      await paste(`
        - a
          - b
      `)

      // wait for render animation to complete
      await sleep(1000)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    // TODO: intermitettently only renders up to a/b
    it.skip('deeply nested', async () => {
      await paste(`
        - a
          - b
            - c
              - d
                - e
                  - f
        - g
      `)

      await press('ArrowUp')

      // wait for render animation to complete
      await sleep(800)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('collapsed subthought', async () => {
      await paste(`
        - a
          - b
        - c
      `)

      // wait for render animation to complete
      await sleep(1000)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    // TODO: Why are b and c not rendered?
    it.skip('multiline thought', async () => {
      await paste(`
        - a
        - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
        - b
        - c
      `)

      await press('ArrowUp')

      // wait for render animation to complete
      await sleep(1000)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    // TODO: Why are e, f, g not rendered?
    it.skip('multiline thought with children', async () => {
      await paste(`
        - a
        - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
          - b
          - c
          - d
        - e
        - f
        - g
      `)

      // move cursor to the multiline thought
      await press('ArrowUp')
      await press('ArrowUp')

      // wait for render animation to complete
      await sleep(1000)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('url', async () => {
      await paste('https://thinkwithem.com')

      // wait for render animation to complete
      await sleep(1000)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('superscript', async () => {
      await paste(`
        - a
          - m
        - b
          - m
      `)

      await press('ArrowUp')

      // wait for render animation to complete
      await sleep(1000)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    // TODO: Superscript position is off
    it.skip('superscript on multiline thought', async () => {
      await paste(`
        - a
          - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
        - b
          - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
      `)

      await press('ArrowUp')

      // wait for render animation to complete
      await sleep(1000)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })
  })
}

describe('Font Size: 18 (default)', () => {
  // run the snapshot tests at font size 18 (default)
  testSuite()
})

describe('Font Size: 14', () => {
  beforeEach(async () => {
    // TODO: identify what needs to be waited for specifically
    await sleep(1000)

    await click('.decrease-font') // 17
    await click('.decrease-font') // 16
    await click('.decrease-font') // 15
    await click('.decrease-font') // 14

    // close alert
    await click('.status-close-x')

    // scroll to top
    await scroll(0, 0)

    // wait for toolbar size transitions to complete
    await sleep(400)
  })

  // run the snapshot tests at font size 14
  testSuite()
})

describe('Font Size: 13', () => {
  beforeEach(async () => {
    // TODO: identify what needs to be waited for specifically
    await sleep(1000)

    await click('.decrease-font') // 17
    await click('.decrease-font') // 16
    await click('.decrease-font') // 15
    await click('.decrease-font') // 14
    await click('.decrease-font') // 13

    // close alert
    await click('.status-close-x')

    // scroll to top
    await scroll(0, 0)

    // wait for toolbar size transitions to complete
    await sleep(400)
  })

  // run the snapshot tests at font size 14
  testSuite()
})

describe('Font Size: 22', () => {
  beforeEach(async () => {
    // TODO: identify what needs to be waited for specifically
    await sleep(1000)

    await click('.increase-font') // 19
    await click('.increase-font') // 20
    await click('.increase-font') // 21
    await click('.increase-font') // 22

    // close alert
    await click('.status-close-x')

    // scroll to top
    await scroll(0, 0)

    // wait for toolbar size transitions to complete
    await sleep(400)
  })

  // run the snapshot tests at font size 22
  testSuite()
})
