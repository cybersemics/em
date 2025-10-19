import path from 'path'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import hide from '../helpers/hide'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import scroll from '../helpers/scroll'
import setTheme from '../helpers/setTheme'
import testIfNotCI from '../helpers/testIfNotCI'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/* From jest-image-snapshot README:

  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/

/** Set up the snapshot tests. These are defined in a function so they can be run at different font sizes (via adjusting the font size in beforeEach). */
const testSuite = () => {
  describe('', () => {
    beforeEach(hideHUD)

    it('subthought', async () => {
      await paste(`
        - a
          - b
      `)

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

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('collapsed subthought', async () => {
      await paste(`
        - a
          - b
        - c
      `)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    // TODO: Test intermittently fails with small differences in 'b'.
    // https://github.com/cybersemics/em/issues/2955
    testIfNotCI('superscript', async () => {
      await paste(`
    - a
      - m
    - b
      - m
  `)

      await press('ArrowUp')

      // TODO: Test intermittently fails with small differences in 'b'.
      // Tested manually with navigator.webdriver = true and 'b' renders at the correct opacity in the next frame, without any animation, so I do not know why this fails.
      // Example failed test runs:
      // - https://github.com/cybersemics/em/actions/runs/14236307211
      // - https://github.com/cybersemics/em/actions/runs/14783509675/job/41507408875?pr=2917
      // Waiting for requestAnimationFrame does not fix the issue.
      await sleep(200)

      expect(await screenshot()).toMatchImageSnapshot()
    })
  })
}

describe('Font Size: 18 (default)', () => {
  // run the snapshot tests at font size 18 (default)
  testSuite()
})

describe('Font Size: 13', () => {
  beforeEach(async () => {
    await click('[data-testid=decrease-font]') // 17
    await click('[data-testid=decrease-font]') // 16
    await click('[data-testid=decrease-font]') // 15
    await click('[data-testid=decrease-font]') // 14
    await click('[data-testid=decrease-font]') // 13

    // close alert
    await hide('[data-testid=alert]')

    // scroll to top
    await scroll(0, 0)
  })

  // run the snapshot tests at font size 14
  testSuite()
})

describe('Font Size: 22', () => {
  beforeEach(async () => {
    await click('[data-testid=increase-font]') // 19
    await click('[data-testid=increase-font]') // 20
    await click('[data-testid=increase-font]') // 21
    await click('[data-testid=increase-font]') // 22

    // close alert
    await hide('[data-testid=alert]')

    // scroll to top
    await scroll(0, 0)
  })

  // run the snapshot tests at font size 22
  testSuite()
})

describe('multiline', () => {
  beforeEach(hideHUD)

  it('multiline thought', async () => {
    await paste(`
        - a
        - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
        - b
        - c
      `)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('multiline thought expanded', async () => {
    await paste(`
        - a
        - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
          - b
          - c
          - d
        - e
        - f
      `)

    // move cursor to the multiline thought
    await press('ArrowUp')
    await press('ArrowUp')

    // TODO: Test intermittently fails if not given time to expand.
    await sleep(100)
    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('superscript on multiline thought', async () => {
    await paste(`
        - a
          - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
        - b
          - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
      `)

    await press('ArrowUp')

    // TODO: Test intermittently fails with small differences in 'b'.
    // Tested manually with navigator.webdriver = true and 'b' renders at the correct opacity in the next frame, without any animation, so I do not know why this fails.
    // Example failed test run: https://github.com/cybersemics/em/actions/runs/14236307211
    // Waiting for requestAnimationFrame does not fix the issue.
    await sleep(200)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })
})

describe('Color Theme', () => {
  // TODO: Flaky test
  // https://github.com/cybersemics/em/issues/2955
  testIfNotCI('superscript on light theme', async () => {
    await setTheme('Light')

    await hideHUD()

    await paste(`
    - a
      - m
    - b
      - m
  `)

    await press('ArrowUp')

    // TODO: Test intermittently fails with small differences in 'b'.
    // Tested manually with navigator.webdriver = true and 'b' renders at the correct opacity in the next frame, without any animation, so I do not know why this fails.
    // Example failed test runs:
    // - https://github.com/cybersemics/em/actions/runs/14236307211
    // - https://github.com/cybersemics/em/actions/runs/14783509675/job/41507408875?pr=2917
    // Waiting for requestAnimationFrame does not fix the issue.
    await sleep(200)

    expect(await screenshot()).toMatchImageSnapshot()
  })

  // TODO: Test stopped working inexplicably when #2935 was merged, although the changes are unrelated.
  // ProtocolError: Protocol error (Target.createBrowserContext): Session with given id not found.
  // https://github.com/cybersemics/em/actions/runs/14957632125?pr=2936
  it.skip('colored and highlighted text', async () => {
    const importText = `
    - Labrador
    - Golden Retriever`

    await paste(importText)

    await clickThought('Golden Retriever')
    await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
    await click('[aria-label="background color swatches"] [aria-label="green"]')

    await clickThought('Labrador')
    await click('[aria-label="text color swatches"] [aria-label="purple"]')

    await hideHUD()

    expect(await screenshot()).toMatchImageSnapshot()
  })
})
