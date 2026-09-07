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

/**
 * Waits until the layout has settled, i.e. the position and size of every thought is unchanged over consecutive
 * animation frames. Table layout converges over several measure passes (each column's width depends on the measured
 * width of its cells, which in turn depends on the space left by the columns before it), so a screenshot taken too
 * early captures a transient layout and the snapshot becomes nondeterministic.
 */
const waitForLayout = () =>
  page.evaluate(async () => {
    /** Serializes the position and size of every thought. */
    const measure = () =>
      Array.from(document.querySelectorAll('[data-editable]'))
        .map(el => {
          const { x, y, width, height } = el.getBoundingClientRect()
          return `${x},${y},${width},${height}`
        })
        .join(' ')

    /** Resolves on the next animation frame. */
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))

    // Consider the layout settled once it is unchanged for 30 consecutive frames (~500ms), and give up after 300
    // frames (~5s) so that a perpetually animating layout fails on the snapshot rather than hanging.
    let previous = ''
    let stableFrames = 0
    for (let i = 0; i < 300 && stableFrames < 30; i++) {
      await nextFrame()
      const current = measure()
      stableFrames = current === previous ? stableFrames + 1 : 0
      previous = current
    }
  })

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

  // Regression test: a col1 thought with a long wrapping note must have its full height measured so the
  // following row (`d`/`e`) clears the bottom of the note instead of overlapping it.
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

  // Regression test for https://github.com/cybersemics/em/issues/3570 (Issue A)
  // Tapping Table View with the cursor on a subthought applies =view/Table to its parent, making the subthought col1
  // and its own children col2. A long col1 must not consume the whole width and crush col2 off the right edge; col1
  // is bounded so that col2 keeps a legible share of the width.
  it('Table View applied to a subthought', async () => {
    await page.setViewport({ width: 375, height: 812 })

    await paste(`
      - One two three four five six seven
        - Eight nine ten eleven twelve thirteen fourteen
          - Fifteen sixteen seventeen eighteen nineteen twenty
    `)

    // Cursor on the subthought, then toggle Table View — applies =view/Table to its parent.
    await clickThought('Eight nine ten eleven twelve thirteen fourteen')
    await command('toggleTableView')

    await waitForLayout()

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  // Regression test for https://github.com/cybersemics/em/pull/4654 (Issue B)
  // Toggling Table View while the cursor is on a top-level thought applies =view/Table to the root context, making
  // the top-level thought col1 and its subthoughts col2. A long col1 must not consume the whole width and push col2
  // off the right edge.
  it('Table View applied to the root context', async () => {
    await page.setViewport({ width: 375, height: 812 })

    await paste(`
      - One two three four five six seven
        - Eight nine ten eleven twelve thirteen fourteen
          - Fifteen sixteen seventeen eighteen nineteen twenty
    `)

    // Cursor on the top-level thought, then toggle Table View — applies =view/Table to the root context.
    await clickThought('One two three four five six seven')
    await command('toggleTableView')

    await waitForLayout()

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  // Regression test for https://github.com/cybersemics/em/pull/4654 (Issue D)
  // When Table View is applied across multiple nested levels, bounding col1 at half the band at every level would
  // compound and crush the deeper columns toward the 1em floor (one character per line) and push them off the right
  // edge. Nested tables share the band across up to three visible levels so the focused columns stay legible, with
  // deeper levels revealed as the cursor descends.
  it('nested Table View across multiple levels', async () => {
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

    await waitForLayout()

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })
})
