import path from 'path'
import configureSnapshots from '../configureSnapshots'
import getEditable from '../helpers/getEditable'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'

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

  // Regression test for https://github.com/cybersemics/em/issues/3568
  it('first subthought should not overlap the parent when Table View is applied to the root context', async () => {
    // Applying Table View to the root context (i.e. toggling it while the cursor is on a top-level thought)
    // makes the top-level thought column 1 and its subthoughts column 2.
    await paste(`
      - =view
        - Table
      - One
        - Lorem Ipsum Dolor Sit Amet Consectetur
        - bla bla
        - note
    `)

    const parent = await getEditable('One')
    const firstSubthought = await getEditable('Lorem Ipsum')

    const parentRect = await parent.boundingBox()
    const subthoughtRect = await firstSubthought.boundingBox()

    if (!parentRect || !subthoughtRect) {
      throw new Error('Could not get bounding boxes for "One" and "Lorem Ipsum"')
    }

    // In Table View the parent (column 1) and its first subthought (column 2) are rendered on the same row.
    // The subthought must begin at or after the right edge of the parent, otherwise the two overlap.
    expect(subthoughtRect.x).toBeGreaterThanOrEqual(parentRect.x + parentRect.width)
  })
})
