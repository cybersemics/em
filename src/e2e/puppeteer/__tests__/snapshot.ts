/* Visual regression tests
 * Snapshot Directory: ./__image_snapshots__
 * Run `jest -u` to update failed snapshots.
 * Press i in jest watch to update failing snapshots interactively.
 * See: https://github.com/americanexpress/jest-image-snapshot
 */
import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import os from 'os'
import path from 'path'
import sleep from '../../../util/sleep'
import helpers from '../helpers'

const snapshotDirectory = os.platform() === 'darwin' ? 'macos' : 'ubuntu'

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
  // custom identifier for snapshots based on the title of the test
  customSnapshotIdentifier: ({ defaultIdentifier }) => {
    return `${defaultIdentifier.replace('snapshot-ts-src-e-2-e-puppeteer-tests-snapshot-ts-', '').toLocaleLowerCase()}`
  },
  // Setting snapshot directory to __image_snapshots__/{platform} to avoid conflicts between platforms.
  customSnapshotsDir: path.join(__dirname, '__image_snapshots__', snapshotDirectory),
})
expect.extend({ toMatchImageSnapshot })

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/* From jest-image-snapshot README:

  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/
// jest.retryTimes(3)

const {
  click,
  openModal,
  paste,
  press,
  remove,
  screenshot,
  scroll,
  type,
  dragAndDropThought,
  simulateDragAndDrop,
  clickThought,
} = helpers()

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

describe('drag', () => {
  beforeEach(removeHUD)

  it('DragAndDropThought', async () => {
    await paste(`
      - a
      - b
      - c
      - d
    `)

    await dragAndDropThought('a', 'd', { position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DropChild', async () => {
    await paste(`
      - a
      - b
      - c
      - d
    `)

    await dragAndDropThought('a', 'b', { position: 'child' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DropEnd', async () => {
    await paste(`
      - x
      - a
        - b
        - c
    `)

    await clickThought('a')

    await dragAndDropThought('x', 'c', { position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DropUncle', async () => {
    await paste(`
      - a
        - b
          - c
            - x
          - d
        - e
    `)

    await clickThought('b')

    // wait for b to expand
    await sleep(100)

    await clickThought('c')

    // wait for c to expand and e to fade out
    await sleep(400)

    await dragAndDropThought('c', 'e', { position: 'before', dropUncle: true })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })
})

describe('drop', () => {
  beforeEach(removeHUD)

  it('DragAndDropThought', async () => {
    await simulateDragAndDrop({ drag: true, drop: true })

    await paste(`
      - a
      - b
      - c
      - d
    `)

    await dragAndDropThought('a', 'd', { position: 'after', mouseUp: true })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  describe('drop targets', () => {
    it('DragAndDropThought and DropChild', async () => {
      await simulateDragAndDrop({ drop: true })
      await paste(`
      - a
      - b
      - c
      - d
    `)

      // wait for .child fade animation
      await sleep(750)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('DropEnd', async () => {
      await simulateDragAndDrop({ drop: true })
      await paste(`
      - a
        - b
          - c
    `)

      await dragAndDropThought('c', 'c', { position: 'after' })

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('DropUncle', async () => {
      await simulateDragAndDrop({ drop: true })
      await paste(`
      - a
        - b
          - c
            - x
          - d
        - e
    `)

      await clickThought('b')

      // wait for b to expand
      await sleep(100)

      await clickThought('c')

      // wait for c to expand and e to fade out
      await sleep(400)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })
  })
})

it('GestureDiagram', async () => {
  await openModal('testGestureDiagram')

  // wait for modal to fade in
  await sleep(400)

  const image = await screenshot()
  expect(image).toMatchImageSnapshot()
})

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
  `)

  // wait for render animation to complete
  await sleep(1000)

  const image = await screenshot()
  expect(image).toMatchImageSnapshot()
})
