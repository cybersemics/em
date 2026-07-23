import path from 'path'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
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
  it('col1 note', async () => {
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
  it('long col1 shares width with col2 instead of crushing it off-screen', async () => {
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

  // Regression test for https://github.com/cybersemics/em/pull/4654 (Issue B)
  // Toggling Table View while the cursor is on a top-level thought applies =view/Table to the root context,
  // making the top-level thought col1 and its subthoughts col2. A long col1 must not consume the whole width
  // and push col2 off the right edge; col1 and col2 should share the available width. The crush only manifests
  // on narrow screens, so use a narrow viewport.
  it('col2 stays on-screen when Table View is toggled on at the thought level', async () => {
    await page.setViewport({ width: 375, height: 812 })

    await paste(`
      - One two three four five six seven
        - Eight nine ten eleven twelve thirteen fourteen
          - Fifteen sixteen seventeen eighteen nineteen twenty
    `)

    // Cursor on the top-level thought, then toggle Table View — applies =view/Table to the root context.
    await clickThought('One two three four five six seven')
    await command('toggleTableView')

    const col1 = await (await getEditable('One two three four five six seven')).boundingBox()
    const col2 = await (await getEditable('Eight nine ten eleven twelve thirteen fourteen')).boundingBox()

    if (!col1 || !col2) {
      throw new Error('Could not get bounding boxes for the table columns')
    }

    const viewportWidth = await page.evaluate(() => window.innerWidth)

    // col2 must remain fully within the viewport (not pushed off the right edge).
    expect(col2.x + col2.width).toBeLessThanOrEqual(viewportWidth)
    // col2 must be legible, not crushed to ~one character per line.
    expect(col2.width).toBeGreaterThan(100)
  })

  // Regression test for https://github.com/cybersemics/em/pull/4654 (Issue C)
  // When Table View is turned off, a thought that was previously a wrapped col2 cell must have its height
  // re-measured. Otherwise the stale (taller) wrapped height leaves a blank gap below it.
  it('no blank gap below a former col2 thought after Table View is turned off', async () => {
    await page.setViewport({ width: 375, height: 812 })

    await paste(`
      - One two three four five six seven
        - Eight nine ten eleven twelve thirteen fourteen
          - Fifteen sixteen seventeen eighteen nineteen twenty
    `)

    // Turn Table View on at the root context, move the cursor down into the table and back, then turn it off.
    await clickThought('One two three four five six seven')
    await command('toggleTableView')
    await clickThought('Eight nine ten eleven twelve thirteen fourteen')
    await clickThought('One two three four five six seven')
    await command('toggleTableView')

    const eight = await (await getEditable('Eight nine ten eleven twelve thirteen fourteen')).boundingBox()
    const fifteen = await (await getEditable('Fifteen sixteen seventeen eighteen nineteen twenty')).boundingBox()

    if (!eight || !fifteen) {
      throw new Error('Could not get bounding boxes for the thoughts')
    }

    // "Fifteen…" should render directly below "Eight…" once Table View is off, with no blank gap.
    // Allow a small tolerance for cliff padding between the two levels.
    expect(fifteen.y - (eight.y + eight.height)).toBeLessThan(eight.height)
  })

  // Regression test for https://github.com/cybersemics/em/pull/4654 (Issue D)
  // When Table View is applied across multiple nested levels, dividing the available width in half at every level
  // would compound and crush the deeper columns toward the 1em floor (one character per line) and push them off the
  // right edge. Nested tables should instead share the band across up to three visible levels so the focused columns
  // stay legible, with deeper levels revealed as the cursor descends.
  it('nested Table View columns stay legible instead of crushing across levels', async () => {
    await page.setViewport({ width: 800, height: 900 })

    // Four nested tables. Each level has =view/Table, so every thought is simultaneously the col1 cell of its parent's
    // table and a table itself — the multi-level nesting from the issue.
    await paste(`
      - The project exceeded all initial expectations.
        - =view
          - Table
        - Every test case passed without any critical issues.
          - =view
            - Table
          - We identified several opportunities for improvement.
            - =view
              - Table
            - The application performed consistently under heavy load.
              - =view
                - Table
              - Documentation was updated after every major change.
    `)

    // Focus a middle level so the three deepest columns are within the visible window.
    await clickThought('We identified several opportunities for improvement.')

    const level3 = await (await getEditable('We identified several opportunities for improvement.')).boundingBox()
    const level4 = await (await getEditable('The application performed consistently under heavy load.')).boundingBox()

    if (!level3 || !level4) {
      throw new Error('Could not get bounding boxes for the nested table columns')
    }

    // Both focused columns must remain legible — not crushed toward the ~1em floor (one character per line).
    expect(level3.width).toBeGreaterThan(100)
    expect(level4.width).toBeGreaterThan(100)
  })
})
