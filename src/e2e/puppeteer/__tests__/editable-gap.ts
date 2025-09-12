import path from 'path'
import configureSnapshots from '../configureSnapshots'
import getEditable from '../helpers/getEditable'
import getEditingText from '../helpers/getEditingText'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot-with-no-antialiasing'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/**
 * Helper function to test clicking between two thoughts.
 * Ensures that clicking in the gap between them sets the cursor on one of the thoughts.
 */
async function testClickBetweenThoughts(thought1: string, thought2: string) {
  const el1 = await getEditable(thought1)
  const el2 = await getEditable(thought2)

  const rect1 = await el1.boundingBox()
  const rect2 = await el2.boundingBox()

  if (!rect1 || !rect2) {
    throw new Error(`Could not get bounding boxes for "${thought1}" and "${thought2}"`)
  }

  const firstThoughtBottom = rect1.y + rect1.height
  // gapY represents the y coordinate of the click in the gap between the two thoughts
  const gapY = firstThoughtBottom + (rect2.y - firstThoughtBottom) / 2
  const clickX = rect1.x + rect1.width / 2

  const currentThought = await getEditingText()

  // Click in the gap
  await page.mouse.click(clickX, gapY)

  const cursorThought = await getEditingText()
  expect(cursorThought).not.toBe(currentThought)
}

/** Add red background to editables to visualize gaps. */
const visualiseEditable = async () =>
  page.addStyleTag({
    content: '[data-editable] { background-color: red !important; }',
  })

describe('Editable Gap Coverage - Click Area Tests', () => {
  beforeEach(hideHUD)

  it('clicking between consecutive single-line thoughts should set cursor on one of them', async () => {
    const importText = `
      - first thought
      - second thought
      - third thought
    `
    await paste(importText)

    // Test clicking between first and second thought
    await testClickBetweenThoughts('first thought', 'second thought')

    // Add red background to editables to visualize gaps
    await visualiseEditable()

    expect(await screenshot()).toMatchImageSnapshot()
  })

  it('clicking between thoughts with different lengths should set cursor appropriately', async () => {
    const importText = `
        - short
        - this is a much longer thought that might have different spacing
        - tiny
      `
    await paste(importText)

    await testClickBetweenThoughts('short', 'this is a much longer thought that might have different spacing')

    // Add red background to editables to visualize gaps
    await visualiseEditable()

    expect(await screenshot()).toMatchImageSnapshot()
  })
})
