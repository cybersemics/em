import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import scroll from '../helpers/scroll'
import setTheme from '../helpers/setTheme'
import type from '../helpers/type'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/** Returns a snapshot for render-thoughts/superscript. */
const superscriptSnapshot = async () => {
  await paste(`
    - a
      - m
    - b
      - m
  `)

  await press('ArrowUp')

  return await screenshot()
}

/* From jest-image-snapshot README:

  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/

/** Set up the snapshot tests. These are defined in a function so they can be run at different font sizes (via adjusting the font size in beforeEach). */
const testSuite = () => {
  describe('', () => {
    it('initial load', async () => {
      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('initial load on light theme', async () => {
      await setTheme('Light')
      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })
  })

  describe('', () => {
    beforeEach(hideHUD)

    it('one thought', async () => {
      await press('Enter')
      await type('a')

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

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

    // TODO: Why are b and c not rendered?
    it.skip('multiline thought', async () => {
      await paste(`
        - a
        - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
        - b
        - c
      `)

      await press('ArrowUp')

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

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('superscript', async () => {
      const image = await superscriptSnapshot()
      expect(image).toMatchImageSnapshot()
    })

    it('superscript on light theme', async () => {
      await setTheme('Light')

      const image = await superscriptSnapshot()
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

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
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
    await click('[data-testid=close-button]')

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
    await click('[data-testid=close-button]')

    // scroll to top
    await scroll(0, 0)
  })

  // run the snapshot tests at font size 22
  testSuite()
})
