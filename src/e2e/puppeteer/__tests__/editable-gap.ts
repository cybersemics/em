import clickThought from '../helpers/clickThought'
import getEditable from '../helpers/getEditable'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import showMousePointer from '../helpers/showMousePointer'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/**
 * Helper function to test clicking between two thoughts with pixel-perfect gap detection.
 * Ensures that clicking in the gap between them sets the cursor on one of the thoughts.
 * Tests for dead zones where selection is lost and validates cursor positioning.
 */
async function testClickBetweenThoughts(thought1: string, thought2: string) {
  const el1 = await getEditable(thought1)
  const el2 = await getEditable(thought2)

  const rect1 = await el1.boundingBox()
  const rect2 = await el2.boundingBox()

  if (!rect1 || !rect2) {
    throw new Error(`Could not get bounding boxes for "${thought1}" and "${thought2}"`)
  }

  // Calculate precise gap boundaries
  const firstThoughtBottom = rect1.y + rect1.height
  const secondThoughtTop = rect2.y
  const gapHeight = secondThoughtTop - firstThoughtBottom

  console.info(`Gap analysis between "${thought1}" and "${thought2}":`)
  console.info(`- First thought bottom: ${firstThoughtBottom}`)
  console.info(`- Second thought top: ${secondThoughtTop}`)
  console.info(`- Gap height: ${gapHeight}px`)

  // click at the middle of the thought
  const clickX = rect1.x + rect1.width / 2

  // Helper function to check if selection is lost (dead zone detection)
  const isSelectionLost = async (): Promise<boolean> => {
    const selection = await getSelection()
    const focusNode = await selection.focusNode
    return !focusNode || focusNode === null
  }

  // Helper function to check if cursor is positioned in the middle of a thought
  const isCursorInMiddle = async (expectedThought: string): Promise<boolean> => {
    const editingText = await getEditingText()
    if (editingText !== expectedThought) return false

    const selection = await getSelection()
    const focusOffset = await selection.focusOffset
    const textContent = await selection.focusNode?.textContent

    if (!textContent || focusOffset === undefined) return false

    // Check if cursor is not at the very beginning (0) or end (textContent.length)
    // This guards against padding clicks that set cursor to edges
    return focusOffset > 0 && focusOffset < textContent.length
  }

  // Test 1: Click at the very bottom edge of first thought (should stay in first thought)
  console.info('Test 1: Clicking at bottom edge of first thought')
  await page.mouse.click(clickX, firstThoughtBottom - Math.abs(gapHeight))

  const cursorThought1 = await getEditingText()
  console.info('cursorThought1:', cursorThought1)
  expect(cursorThought1).toBe(thought1)
  expect(await isCursorInMiddle(thought1)).toBe(true)

  // Test 2: Click at the very top edge of second thought (should move to second thought)
  console.info('Test 2: Clicking at top edge of second thought')
  await page.mouse.click(clickX, secondThoughtTop + Math.abs(gapHeight))

  const cursorThought2 = await getEditingText()
  console.info('cursorThought2:', cursorThought2)
  expect(cursorThought2).toBe(thought2)
  expect(await isCursorInMiddle(thought2)).toBe(true)

  // Test 3: Click in the exact middle of the gap (if gap exists)
  if (gapHeight > 2) {
    console.info('Test 3: Clicking in exact middle of gap')
    const gapMiddleY = firstThoughtBottom + gapHeight / 2
    await page.mouse.click(clickX, gapMiddleY)

    const cursorThought3 = await getEditingText()
    console.info('cursorThought3:', cursorThought3)

    // Selection should not be lost (no dead zone)
    expect(await isSelectionLost()).toBe(false)

    // Should be on one of the adjacent thoughts
    expect([thought1, thought2]).toContain(cursorThought3)

    // Cursor should be positioned in the middle of the thought, not at edges
    if (cursorThought3) {
      expect(await isCursorInMiddle(cursorThought3)).toBe(true)
    }
  }

  // Test 4: Click at precise gap boundaries to detect edge cases
  console.info('Test 4: Testing gap boundaries')

  // Test boundary at first thought bottom
  await page.mouse.click(clickX, firstThoughtBottom)
  const boundaryThought1 = await getEditingText()
  console.info('boundaryThought1:', boundaryThought1)
  expect(await isSelectionLost()).toBe(false)
  expect([thought1, thought2]).toContain(boundaryThought1)

  // Test boundary at second thought top
  await page.mouse.click(clickX, secondThoughtTop)
  const boundaryThought2 = await getEditingText()
  console.info('boundaryThought2:', boundaryThought2)
  expect(await isSelectionLost()).toBe(false)
  expect([thought1, thought2]).toContain(boundaryThought2)

  // Test 5: Click in padding areas to ensure cursor doesn't go to edges
  console.info('Test 5: Testing padding click behavior')

  // Click in left padding area of second thought
  await page.mouse.click(rect2.x - 5, rect2.y + rect2.height / 2)
  const paddingThought = await getEditingText()
  console.info('paddingThought:', paddingThought)

  if (paddingThought === thought2) {
    // If we're in the second thought, cursor should be in middle, not at edges
    expect(await isCursorInMiddle(thought2)).toBe(true)
  }

  console.info('All gap tests completed successfully!')
}

/**
 * Helper function to test gap detection with detailed logging
 */
const testGapDetection = async (thought1: string, thought2: string) => {
  const el1 = await getEditable(thought1)
  const el2 = await getEditable(thought2)

  const rect1 = await el1.boundingBox()
  const rect2 = await el2.boundingBox()

  if (!rect1 || !rect2) {
    throw new Error(`Could not get bounding boxes for "${thought1}" and "${thought2}"`)
  }

  const gapHeight = rect2.y - (rect1.y + rect1.height)

  console.info(`\n=== Gap Detection Analysis ===`)
  console.info(`Thought 1: "${thought1}"`)
  console.info(`  - Position: (${rect1.x}, ${rect1.y})`)
  console.info(`  - Size: ${rect1.width}x${rect1.height}`)
  console.info(`  - Bottom: ${rect1.y + rect1.height}`)

  console.info(`Thought 2: "${thought2}"`)
  console.info(`  - Position: (${rect2.x}, ${rect2.y})`)
  console.info(`  - Size: ${rect2.width}x${rect2.height}`)
  console.info(`  - Top: ${rect2.y}`)

  console.info(`Gap Analysis:`)
  console.info(`  - Height: ${gapHeight}px`)
  console.info(`  - Type: ${gapHeight > 0 ? 'Gap exists' : gapHeight === 0 ? 'No gap' : 'Overlap'}`)

  return {
    gapHeight,
    firstThoughtBottom: rect1.y + rect1.height,
    secondThoughtTop: rect2.y,
    clickX: rect1.x + rect1.width / 2,
  }
}

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

    // Test gap detection with detailed analysis
    const gapInfo = await testGapDetection('apples', 'banana')
    console.info('Gap detection completed:', gapInfo)

    // Test clicking between first and second thought
    await testClickBetweenThoughts('apples', 'banana')
  })

  // it('clicking between thoughts with different lengths should set cursor appropriately', async () => {
  //   const importText = `
  //     - short
  //     - this is a much longer thought that might have different spacing
  //     - tiny
  //   `
  //   await paste(importText)

  //   await clickThought('short')

  //   // Test gap detection for different length thoughts
  //   const gapInfo = await testGapDetection('short', 'this is a much longer thought that might have different spacing')
  //   console.info('Different length gap detection:', gapInfo)

  //   // Test clicking between thoughts with different lengths
  //   await testClickBetweenThoughts('short', 'this is a much longer thought that might have different spacing', 'tiny')

  //   // Optional: Enable visualization for debugging
  //   // await visualiseEditable()
  //   // await visualiseGaps('short', 'this is a much longer thought that might have different spacing')

  //   // Uncomment to take screenshot for visual verification
  //   // expect(await screenshot()).toMatchImageSnapshot()
  // })

  // it('should detect dead zones where clicking causes selection loss', async () => {
  //   const importText = `
  //     - first thought
  //     - second thought
  //     - third thought
  //   `
  //   await paste(importText)

  //   await clickThought('first thought')

  //   // Test systematic clicking across the gap to detect dead zones
  //   const el1 = await getEditable('first thought')
  //   const el2 = await getEditable('second thought')

  //   const rect1 = await el1.boundingBox()
  //   const rect2 = await el2.boundingBox()

  //   if (!rect1 || !rect2) {
  //     throw new Error('Could not get bounding boxes')
  //   }

  //   const firstThoughtBottom = rect1.y + rect1.height
  //   const secondThoughtTop = rect2.y
  //   const gapHeight = secondThoughtTop - firstThoughtBottom
  //   const clickX = rect1.x + rect1.width / 2

  //   console.info(`Testing for dead zones in gap of height: ${gapHeight}px`)

  //   // Test multiple points within the gap
  //   const testPoints = []
  //   if (gapHeight > 0) {
  //     // Test at 25%, 50%, and 75% of the gap
  //     testPoints.push(firstThoughtBottom + gapHeight * 0.25)
  //     testPoints.push(firstThoughtBottom + gapHeight * 0.5)
  //     testPoints.push(firstThoughtBottom + gapHeight * 0.75)
  //   }

  //   for (let i = 0; i < testPoints.length; i++) {
  //     const testY = testPoints[i]
  //     console.info(`Testing dead zone at Y: ${testY}`)

  //     await page.mouse.click(clickX, testY)

  //     // Check if selection is lost (dead zone)
  //     const selection = await getSelection()
  //     const focusNode = await selection.focusNode
  //     const isDeadZone = !focusNode || focusNode === null

  //     if (isDeadZone) {
  //       console.warn(`Dead zone detected at Y: ${testY}`)
  //     } else {
  //       const editingText = await getEditingText()
  //       console.info(`Selection maintained at Y: ${testY}, editing: "${editingText}"`)

  //       // Ensure we're on one of the adjacent thoughts
  //       expect(['first thought', 'second thought']).toContain(editingText)
  //     }
  //   }

  //   console.info('Dead zone detection test completed')
  // })
})
