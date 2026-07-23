import path from 'path'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import getEditable from '../helpers/getEditable'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'
import { page } from '../session'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

describe('Table View', () => {
  beforeEach(hideHUD)

  /**
   * "col1 narrow" means that all thoughts in the first column have short text, so the first table column can be narrower in order to give plenty of room for the second column.
   * "no wrap" refers to the fact that all the thoughts in the second column can fit on a single line.
   */
  it('col1 narrow + no wrap width', async () => {
    await paste(`
      - X
        - =view
          - Table
        - A
          - Atlanta, Georgia
        - B
          - Boston, Massachusetts
        - C
          - Cincinnati, Ohio
    `)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  /**
   * "col2 narrow" means that all thoughts in the second column have short text, so the second table column can be narrower in order to give plenty of room for the first column.
   * "no wrap" refers to the fact that all the thoughts in the first column can fit on a single line.
   */
  it('col2 narrow + no wrap width', async () => {
    await paste(`
      - X
        - =view
          - Table
        - All of Us Strangers
          - 4/5
        - Eileen
          - 2/5
        - May December
          - 2/5
    `)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  // TODO: Why does this not work in puppeteer? The y value of `d` is incorrect. It does not clear the height of `b`.
  // This works fine in the actual app..
  it.skip('col1 note', async () => {
    await paste(`
      - a
        - =view
          - Table
        - b
          - =note
            - This is a long note that wraps onto multiple lines.
          - c
        - d
          - e
    `)

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  // Regression test for https://github.com/cybersemics/em/issues/3570
  // When Table View is applied to a thought whose col1 text is long, col1 must not consume the whole
  // width and crush col2 off the right edge. Instead col1 and col2 should share the available width and
  // wrap responsively. The crush only manifests on narrow screens, so use a narrow viewport.
  // .skip keeps normal CI green while the test is red (before the fix); the skip is removed when the fix lands.
  it.skip('long col1 shares width with col2 instead of crushing it off-screen', async () => {
    await page.setViewport({ width: 500, height: 900 })

    // =view/Table on the parent makes "Eight…" col1 and "Fifteen…" col2 — the end state of tapping the
    // Table View toolbar button (which toggles =view/Table on the cursor's parent) with the cursor on "Eight…".
    await paste(`
      - One two three four five six seven
        - =view
          - Table
        - Eight nine ten eleven twelve thirteen fourteen
          - Fifteen sixteen seventeen eighteen nineteen twenty
    `)

    // Match the reported reproduction: cursor on the col1 thought.
    await clickThought('Eight nine ten eleven twelve thirteen fourteen')

    const col1 = await (await getEditable('Eight nine ten eleven twelve thirteen fourteen')).boundingBox()
    const col2 = await (await getEditable('Fifteen sixteen seventeen eighteen nineteen twenty')).boundingBox()

    if (!col1 || !col2) {
      throw new Error('Could not get bounding boxes for the table columns')
    }

    const viewportWidth = await page.evaluate(() => window.innerWidth)

    // col2 must remain fully within the viewport (not pushed off the right edge).
    expect(col2.x + col2.width).toBeLessThanOrEqual(viewportWidth)
    // col2 must be legible, not crushed to ~one character per line.
    expect(col2.width).toBeGreaterThan(120)
    // col1 and col2 should share the available width, so col2 is at least half as wide as col1.
    expect(col2.width).toBeGreaterThan(col1.width * 0.5)
  })
})
