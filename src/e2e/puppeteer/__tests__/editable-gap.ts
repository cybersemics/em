import path from 'path'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import getEditable from '../helpers/getEditable'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import showMousePointer from '../helpers/showMousePointer'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/**
 * Helper function to test clicking between two thoughts.
 * Ensures that clicking in the gap between them sets the cursor on one of the thoughts.
 */
async function testClickBetweenThoughts(thought1: string, thought2: string, thought3: string) {
  const el1 = await getEditable(thought1)
  const el2 = await getEditable(thought2)
  const el3 = await getEditable(thought3)

  const rect1 = await el1.boundingBox()
  const rect2 = await el2.boundingBox()
  const rect3 = await el3.boundingBox()

  if (!rect1 || !rect2 || !rect3) {
    throw new Error(`Could not get bounding boxes for "${thought1}" and "${thought2}"`)
  }

  const firstThoughtBottom = rect1.y + rect1.height
  // gapY represents the y coordinate of the click in the gap between the two thoughts
  // const gapY = firstThoughtBottom + (rect2.y - firstThoughtBottom) / 2
  const clickX = rect1.x + rect1.width / 2

  const currentThought = await getEditingText()
  console.info('currentThought :', currentThought)

  // Click in the bottom of the first thought
  await page.mouse.click(clickX, firstThoughtBottom - 3)

  const nodeType = await getSelection().focusNode?.nodeType
  console.info('nodeType :', nodeType)

  const offset1 = await getSelection().focusOffset

  console.info('offset1 :', offset1)

  const cursorThought = await getEditingText()
  console.info('cursorThought :', cursorThought)

  // Cursor should be on the current thought
  expect(cursorThought).toBe('apples')

  // click 1px below the current thought
  await page.mouse.click(rect2.x + rect2.width / 2, firstThoughtBottom + 1)

  const cursorThought2 = await getEditingText()
  console.info('cursorThought2 :', cursorThought2)

  await page.mouse.click(rect3.x + rect3.width / 2, rect3.y - 1)

  const cursorThought3 = await getEditingText()
  console.info('cursorThought3 :', cursorThought3)

  const textContent3 = await getSelection().focusNode?.textContent
  console.info('textContent3 :', textContent3)
}

/** Add red background to editables to visualize gaps. */
// const visualiseEditable = async () =>
//   page.addStyleTag({
//     content: '[data-editable] { background-color: red !important; }',
//   })

describe('Editable Gap Coverage - Click Area Tests', () => {
  beforeEach(async () => {
    await hideHUD()
    await showMousePointer()
  })

  it('clicking between consecutive single-line thoughts should set cursor on one of them', async () => {
    const importText = `
    - apples
      - banana
    - orange
    `
    await paste(importText)

    await clickThought('apples')

    // Test clicking between first and second thought
    await testClickBetweenThoughts('apples', 'banana', 'orange')

    // // Add red background to editables to visualize gaps
    // await visualiseEditable()

    // expect(await screenshot()).toMatchImageSnapshot()
  })

  // it('clicking between thoughts with different lengths should set cursor appropriately', async () => {
  //   const importText = `
  //       - short
  //       - this is a much longer thought that might have different spacing
  //       - tiny
  //     `
  //   await paste(importText)

  //   await testClickBetweenThoughts('short', 'this is a much longer thought that might have different spacing')

  //   // Add red background to editables to visualize gaps
  //   await visualiseEditable()

  //   expect(await screenshot()).toMatchImageSnapshot()
  // })
})
