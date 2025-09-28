import clickThought from '../helpers/clickThought'
import getEditable from '../helpers/getEditable'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import { page } from '../setup'

// Intentional overlap between thoughts to fix selection behavior
// See: useSizeTracking.ts lineHeightOverlap calculation
// const EXPECTED_OVERLAP = DEFAULT_FONT_SIZE / 8

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Helper function to check if cursor is positioned in the middle of a thought. */
async function isCursorInMiddle(expectedThought: string): Promise<boolean> {
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

/** Helper function to check if selection is lost (dead zone detection). */
const isSelectionLost = async () => {
  const selection = await getSelection()
  const focusNode = await selection.focusNode
  return !focusNode || focusNode === null
}

/**
 * Helper function to test clicking between two thoughts with proper overlap handling.
 * Validates that clicking in overlapping areas behaves correctly and tests for dead zones.
 * Tests cursor positioning to ensure clicks don't set cursor to beginning/end of thoughts.
 */
async function testClickBetweenThoughts(thought1: string, thought2: string) {
  const el1 = await getEditable(thought1)
  const el2 = await getEditable(thought2)

  const rect1 = await el1.boundingBox()
  const rect2 = await el2.boundingBox()

  if (!rect1 || !rect2) {
    throw new Error(`Could not get bounding boxes for "${thought1}" and "${thought2}"`)
  }

  // Calculate overlap (expected to be negative due to intentional overlap)
  const firstThoughtBottom = rect1.y + rect1.height
  const secondThoughtTop = rect2.y

  // Note: negative = overlap
  const overlapHeight = secondThoughtTop - firstThoughtBottom

  // click at the middle of the thought
  const clickX = rect1.x + rect1.width / 2

  // Test 1: Click in top edge of the overlap zone (should be in first thought)
  console.info('Test 1: Clicking in top edge of the overlap zone')
  await page.mouse.click(clickX, firstThoughtBottom + overlapHeight)

  expect(await isSelectionLost()).toBe(false)
  expect(await isCursorInMiddle(thought1)).toBe(true)
  expect(await getEditingText()).toBe(thought1)

  // Test 2: Click just below the overlap zone (should be in second thought)
  console.info('Test 2: Clicking just below overlap zone')
  await page.mouse.click(clickX, secondThoughtTop - overlapHeight + 1)

  expect(await isSelectionLost()).toBe(false)
  expect(await isCursorInMiddle(thought2)).toBe(true)
  expect(await getEditingText()).toBe(thought2)

  // Test 3: Click in the overlap zone (should work on one of the thoughts, not create dead zone)
  console.info('Test 3: Clicking in exact middle of overlap zone')
  await page.mouse.click(clickX, firstThoughtBottom + overlapHeight / 2)

  const cursorThought3 = await getEditingText()

  // Selection should not be lost (no dead zone)
  expect(await isSelectionLost()).toBe(false)

  // Should be on one of the adjacent thoughts
  expect([thought1, thought2]).toContain(cursorThought3)

  if (cursorThought3) {
    expect(await isCursorInMiddle(cursorThought3)).toBe(true)
  }

  console.info('All gap tests completed successfully!')
}

describe('Dead zone detection', () => {
  beforeEach(async () => {
    await hideHUD()
  })

  it('clicking between consecutive single-line thoughts should handle overlap correctly', async () => {
    const importText = `
    - apples
    - banana
    - orange
    `
    await paste(importText)

    await clickThought('apples')

    await testClickBetweenThoughts('apples', 'banana')
  })
})
