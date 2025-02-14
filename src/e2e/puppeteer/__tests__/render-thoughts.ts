import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import getEditingText from '../helpers/getEditingText'
import hide from '../helpers/hide'
import hideHUD from '../helpers/hideHUD'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import scroll from '../helpers/scroll'
import setTheme from '../helpers/setTheme'

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

  return screenshot()
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
  })

  describe('', () => {
    beforeEach(hideHUD)

    it('one thought', async () => {
      await press('Enter')
      await keyboard.type('a')

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

describe('Color Theme', () => {
  it('initial load on light theme', async () => {
    await setTheme('Light')
    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('superscript on light theme', async () => {
    await setTheme('Light')

    await hideHUD()
    const image = await superscriptSnapshot()
    expect(image).toMatchImageSnapshot()
  })

  it('colored and highlighted text', async () => {
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

describe('Undo/Redo', () => {
  it('Re-render cursor thought on undo', async () => {
    // create a thought "hello"
    await press('Enter')
    await keyboard.type('hello')

    // create a thought "a"
    await press('Enter')
    await keyboard.type('a')

    // edit "hello" to "hello world"
    await clickThought('hello')
    await press('ArrowRight', { ctrl: true })
    await keyboard.type(' world')

    // undo
    await press('z', { meta: true })

    const thoughtValue = await getEditingText()
    expect(thoughtValue).toBe('hello')
  })
})
