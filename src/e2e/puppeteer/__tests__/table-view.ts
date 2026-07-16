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
  it('nested Table View: a grandchild table reveals its own columns instead of crushing them off-screen', async () => {
    // The bug is most pronounced on wide screens, where the counter-indentation shifts the tree less
    // and the deeply nested columns are pushed off the right edge. Use a wide viewport to reproduce it.
    await page.setViewport({ width: 1600, height: 1000 })

    // Three nested Table Views (on the parent, the subthought, and the grandchild). When the cursor is on
    // the grandchild — which is itself a table with a wide col1 — its own col2 (the great-grandchildren)
    // must be revealed with adequate width rather than crushed to near-zero width off the right edge.
    await paste(`
      - A long title thought Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing Elit
        - =view
          - Table
        - B first subthought
          - =view
            - Table
          - G grandchild one Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing Elit Sed Do Eiusmod Tempor
            - =view
              - Table
            - H great grandchild formatting should like this
              - HH deepest content
            - H2 great grandchild two Wo this awkward
          - G2 grandchild two
        - B2 second subthought
    `)

    // Place the cursor on the middle table thought (the grandchild). Its children form a nested table.
    await clickThought('G grandchild one Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing Elit Sed Do Eiusmod Tempor')

    const deepest = await getEditable('HH deepest content')
    const deepestRect = await deepest.boundingBox()

    if (!deepestRect) {
      throw new Error('Could not get bounding box for the deepest nested table column')
    }

    // Without the fix the deepest column is pushed off the right edge and crushed to ~0 width (wrapping one character per line).
    // After the fix, navigating into the nested table reveals it with a readable width that fits within the viewport.
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(deepestRect.width).toBeGreaterThan(100)
    expect(deepestRect.x + deepestRect.width).toBeLessThanOrEqual(viewportWidth)
  })
})
