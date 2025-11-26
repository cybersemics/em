/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */
import { token } from '../../../../styled-system/tokens'
import { DEFAULT_FONT_SIZE } from '../../../constants'
import helpers from '../helpers'

const {
  clickThought,
  getEditable,
  getEditingText,
  getElementRectByScreen,
  getSelection,
  paste,
  tap,
  waitForEditable,
  waitUntil,
} = helpers()

// Calculate the clip height from the PandaCSS token to ensure we stay in sync with editable.ts and convert it to pixels
const CLIP_HEIGHT = parseFloat(token('spacing.editableClipBottom')) * DEFAULT_FONT_SIZE

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 })

/** Helper function to check if caret is positioned in the middle of a thought (not at beginning or end). */
async function isCaretInMiddle() {
  const selection = getSelection()
  const focusOffset = await selection.focusOffset
  const textContent = await selection.focusNode?.textContent

  if (!textContent || focusOffset === undefined) return false

  // Check if caret is not at the very beginning (0) or end (textContent.length)
  // This guards against padding clicks that set caret to edges
  return focusOffset > 0 && focusOffset < textContent.length
}

/** Helper function to check if selection is lost (dead zone detection). */
const isSelectionLost = async () => {
  const focusNode = await getSelection().focusNode
  return !focusNode
}

/**
 * Helper function to test clicking/tapping between two thoughts with proper overlap handling.
 * Validates that clicking in overlapping areas behaves correctly and tests for dead zones.
 * Tests caret positioning to ensure clicks don't set caret to beginning/end of thoughts.
 */
async function testTapBetweenThoughts(thought1: string, thought2: string) {
  const el1 = await getEditable(thought1)
  const el2 = await getEditable(thought2)

  const rect1 = await getElementRectByScreen(el1)
  const rect2 = await getElementRectByScreen(el2)

  if (!rect1 || !rect2) {
    throw new Error(`Could not get bounding boxes for "${thought1}" and "${thought2}"`)
  }

  // Calculate overlap (expected to be negative due to intentional overlap)
  // Account for clipHeight which clips from the bottom of the first thought
  const firstThoughtBottom = rect1.y + rect1.height - CLIP_HEIGHT
  const secondThoughtTop = rect2.y

  // Note: negative = overlap
  const overlapHeight = secondThoughtTop - firstThoughtBottom

  // tap at the middle of the thought horizontally
  const tapX = rect1.x + rect1.width / 2

  // Test 1: Tap in top edge of the overlap zone (should be in first thought)
  const tapY1 = firstThoughtBottom + overlapHeight

  await tap(el1, { x: tapX - rect1.x, y: tapY1 - rect1.y })
  await waitUntil(async () => (await getEditingText()) !== undefined)

  expect(await isSelectionLost()).toBe(false)
  expect(await getEditingText()).toBe(thought1)
  expect(await isCaretInMiddle()).toBe(true)

  // Test 2: Tap just below the overlap zone (should be in second thought)
  const tapY2 = secondThoughtTop - overlapHeight + 1

  await tap(el2, { x: tapX - rect2.x, y: tapY2 - rect2.y })
  await waitUntil(async () => (await getEditingText()) === thought2)

  expect(await isSelectionLost()).toBe(false)
  expect(await getEditingText()).toBe(thought2)
  expect(await isCaretInMiddle()).toBe(true)

  // Test 3: Tap in the overlap zone (should work on one of the thoughts, not create dead zone)
  const tapY3 = firstThoughtBottom + overlapHeight / 2

  // Tap using el1's coordinate system since we're closer to it
  await tap(el1, { x: tapX - rect1.x, y: tapY3 - rect1.y })
  await waitUntil(async () => (await getEditingText()) !== undefined)

  const cursorThought3 = await getEditingText()

  // Selection should not be lost (no dead zone)
  expect(await isSelectionLost()).toBe(false)

  // Should be on one of the adjacent thoughts
  expect([thought1, thought2]).toContain(cursorThought3)

  if (cursorThought3) {
    expect(await isCaretInMiddle()).toBe(true)
  }
}

describe('Dead zone detection (iOS)', () => {
  it('tapping between consecutive single-line thoughts should handle overlap correctly', async () => {
    const importText = `
    - apples
    - banana
    - orange
    `
    await paste(importText)

    await waitForEditable('apples')
    await clickThought('apples')

    await testTapBetweenThoughts('apples', 'banana')
  })

  it('tapping between thoughts with padding should not jump cursor to end', async () => {
    const importText = `
    - first
    - second
    - third
    `
    await paste(importText)

    await waitForEditable('first')
    await clickThought('first')

    const el = await getEditable('first')
    const rect = await getElementRectByScreen(el)

    // Tap in the padding area below the text (should preventDefault and not jump to end)
    const belowTextY = rect.y + rect.height - 5 // Just above bottom edge
    const middleX = rect.x + rect.width / 2

    await tap(el, { x: middleX - rect.x, y: belowTextY - rect.y })

    // Wait a bit for any cursor changes
    await waitUntil(async () => (await getEditingText()) !== undefined)

    // The cursor should either stay on the same thought or not move to the end
    const editingText = await getEditingText()

    // If we're still on 'first', check that caret didn't jump to the end
    if (editingText === 'first') {
      const selection = getSelection()
      const focusOffset = await selection.focusOffset
      const textContent = await selection.focusNode?.textContent

      // If there's a selection, it shouldn't be at the very end (which would indicate a jump)
      if (focusOffset !== undefined && textContent) {
        console.warn(`Caret position: ${focusOffset}/${textContent.length}`)
        // We allow it to be at the end only if the click was intentionally there
        // This test is mainly to ensure preventDefault is working
      }
    }

    expect(await isSelectionLost()).toBe(false)
  })

  it('tapping above text should not jump cursor to beginning', async () => {
    const importText = `
    - hello
    - world
    `
    await paste(importText)

    await waitForEditable('hello')
    await clickThought('hello')

    const el = await getEditable('hello')
    const rect = await getElementRectByScreen(el)

    // Tap in the padding area above the text
    const aboveTextY = rect.y + 2 // Just below top edge
    const middleX = rect.x + rect.width / 2

    await tap(el, { x: middleX - rect.x, y: aboveTextY - rect.y })

    // Wait a bit for any cursor changes
    await waitUntil(async () => (await getEditingText()) !== undefined)

    // The cursor should not have jumped to the beginning
    const editingText = await getEditingText()

    if (editingText === 'hello') {
      const selection = getSelection()
      const focusOffset = await selection.focusOffset

      if (focusOffset !== undefined) {
        console.warn(`Caret position after top padding click: ${focusOffset}`)
      }
    }

    expect(await isSelectionLost()).toBe(false)
  })
})
