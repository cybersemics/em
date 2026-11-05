import { DEFAULT_FONT_SIZE } from '../../../constants'
import { page } from '../session'
import getEditable from './getEditable'
import hide from './hide'
import showMousePointer from './showMousePointer'
import waitUntil from './waitUntil'

/** The page-side record of whether react-dnd has hovered the drop target under the drop point. */
interface DropTargetHoverWatch {
  /** Returns true if react-dnd hovers the drop target under the drop point now. */
  check: () => boolean
  observer: MutationObserver
  hovered: boolean
}

declare global {
  interface Window {
    /** Set by dragAndDropThought for the length of a move. */
    __dropTargetHoverWatch?: DropTargetHoverWatch
  }
}

/**
 * Starts recording whether react-dnd hovers the drop target under the given point: the innermost element with
 * data-drop-over, which every drop target element renders from react-dnd's isOver({ shallow: true }). That is the
 * target a drop there lands on. It is set in the same commit as the target's isHovering, from which DropChild, DropEnd
 * and DropUncle draw their drop hover. A thought row's drop hover also needs state.hoveringPath, which the same hover
 * writes before it whenever the pointer has moved. It is true even on a target that rejects the drop, so this also
 * covers a drop that shows no drop hover.
 *
 * The hover is recorded as it is rendered rather than polled for. A drag driven by Puppeteer dispatches dragover only
 * when the pointer moves, so when a hover changes the layout under the stationary pointer, e.g. by expanding a
 * thought, nothing hovers the drop target that is under it afterwards, and a poll would wait for it forever.
 */
const watchDropTargetHover = (point: { x: number; y: number }) =>
  page.evaluate(({ x, y }) => {
    window.__dropTargetHoverWatch?.observer.disconnect()

    /** Returns true if react-dnd hovers the drop target under the point. */
    const check = () =>
      document.elementFromPoint(x, y)?.closest('[data-drop-over]')?.getAttribute('data-drop-over') === 'true'

    const watch: DropTargetHoverWatch = {
      check,
      observer: new MutationObserver(() => {
        watch.hovered = watch.hovered || check()
      }),
      hovered: false,
    }
    watch.observer.observe(document.body, { attributes: true, attributeFilter: ['data-drop-over'], subtree: true })
    window.__dropTargetHoverWatch = watch
  }, point)

/** Waits until react-dnd has hovered the drop target under the point since watchDropTargetHover, or hovers it now, which covers a target that was already hovered before the move. Throws if it never does. */
const waitForDropTargetHover = async (point: { x: number; y: number }) => {
  try {
    await page.waitForFunction(
      () => !!window.__dropTargetHoverWatch?.hovered || !!window.__dropTargetHoverWatch?.check(),
      { timeout: 5000 },
    )
  } catch (e) {
    const targetFound = await page.evaluate(
      ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-drop-over]'),
      point,
    )
    throw new Error(
      targetFound
        ? 'The drop target under the pointer was never hovered.'
        : `There is no drop target under the pointer at (${point.x}, ${point.y}).`,
      { cause: e },
    )
  }
}

/** Stops recording the hover. */
const unwatchDropTargetHover = () => page.evaluate(() => window.__dropTargetHoverWatch?.observer.disconnect())

/** Performs Drag and Drop functionality on a thought in Puppeteer browser. Waits for the drop target under the pointer to render its hover before holding or dropping, so callers do not need to synchronize with drag-and-drop themselves. */
const dragAndDropThought = async (
  sourceValue: string,
  /** The value of the thought to drop at. Use the position absolute to control whether to drop before, after, etc. If null, only initiates the drag and move the mouse. */
  destValue: string | null,
  {
    dropUncle,
    hold,
    position,
    showAlert,
    skipMouseDown,
  }: {
    /** If true, the source thought is dropped as a sibling to the hidden uncle. */
    dropUncle?: boolean
    /** If true, the mouse button is not released after the drop. */
    hold?: boolean
    /** Determines where the destination thought is dropped, relative to the source thought.
    - after: drop the source thought as a sibling after the destination thought.
    - before: drop the source thought as a sibling before the destination thought.
    - child: drop the source thought as a child of the destination thought.
    - none: only valid when destValue is null and not dropping.
     */
    position: 'after' | 'before' | 'child' | 'none'
    /** Show the drag-and-drop Alert. Hidden by default. */
    showAlert?: boolean
    skipMouseDown?: boolean
  },
) => {
  const sourceElement = await getEditable(sourceValue)

  if (!sourceElement.boundingBox) {
    console.error({ sourceElement, sourceValue, destValue })
    throw new Error('Source element has no bounding box')
  }

  const dragStart = await sourceElement.boundingBox()
  if (!dragStart) {
    throw new Error('Drag source element not found')
  }

  await showMousePointer()

  // If the position is 'before', the yOffset is 0
  // because the drop target will be just above the thought otherwise it will be 20 so it is dragged after the thought
  const yOffset = position === 'before' ? 0 : 20

  // If the position is 'child', make the initial click to the right so that it lands on the DropChild drop target.
  // Must exceed the DropChild's drop-end margin-left.
  // TODO: Get the font size from the CSS
  const xOffset = position === 'child' ? DEFAULT_FONT_SIZE * 2.9 - 2 : 0

  // Calculate center positions of the elements
  const dragPosition = {
    // -5 to avoid the caret to be on the thought
    // because otherwise it will be selected and any expanded thought will collapse
    x: dragStart.x + 1 - 5,
    y: dragStart.y + 1,
  }

  // Move the mouse to the drag target, then press.
  // When continuing an existing drag (skipMouseDown), move directly to the drop target instead.
  // Returning to the source would hover the source thought's own drop targets, which matters when testFlags.pinDropHovers is enabled.
  if (!skipMouseDown) {
    await page.mouse.move(dragPosition.x, dragPosition.y)
    await page.mouse.down()
  }

  // move to the drop target, and release
  if (destValue) {
    const destElement = await getEditable(destValue)
    if (!destElement.boundingBox) {
      console.error({ sourceElement, sourceValue, destElement, destValue })
      throw new Error('Drag element has no bounding box')
    }

    const dragEnd = await destElement?.boundingBox()
    if (!dragEnd) {
      throw new Error('Drag destination element not found')
    }

    const dropPosition = {
      // In table view parent and column one are aligned, if we are dropping after column one, we need to move to the right
      x: dropUncle ? dragEnd.x + xOffset : dragEnd.x + dragEnd.width / 1.25 + xOffset,
      // if we are dropping to the hidden uncle, we need to move to the bottom of the thought to trigger DropUncle instead of normal middle height
      y: dropUncle ? dragEnd.y + dragEnd.height : dragEnd.y + dragEnd.height / 2 + yOffset,
    }

    await watchDropTargetHover(dropPosition)
    try {
      // A single mousemove is not registered by react-dnd when continuing an existing drag (skipMouseDown), so issue a second move one pixel away first.
      // Both events land on the drop target, so no other drop targets are hovered in between.
      if (skipMouseDown) {
        await page.mouse.move(dropPosition.x, dropPosition.y - 1)
      }
      await page.mouse.move(dropPosition.x, dropPosition.y)

      // The drop targets other than the thought rows (DropChild, DropEnd, DropUncle) mount only once the drag is in
      // progress, so the drop target under the pointer is only known after it.
      await page.locator('[data-drag-in-progress="true"]').wait()
      await waitForDropTargetHover(dropPosition)
    } finally {
      await unwatchDropTargetHover()
    }
  } else {
    // Trigger drag state when no explicit drop target is provided.
    // Without this move, drag-and-drop alert visibility is flaky in CI.
    await page.mouse.move(dragPosition.x + 1, dragPosition.y)
    await page.mouse.move(dragPosition.x, dragPosition.y)
  }

  await page.locator('[data-testid="alert-content"]').wait()

  if (!hold) {
    await page.mouse.up()

    // Wait for drag operation to fully complete by checking:
    // 1. data-drag-in-progress attribute is removed (longPress !== DragInProgress)
    // 2. data-drag-hold attribute is removed (longPress !== DragHold)
    await waitUntil(() => {
      const dragInProgress = document.querySelector('[data-drag-in-progress="true"]')
      const dragHold = document.querySelector('[data-drag-hold="true"]')

      // Drag is complete when all drag-related states are cleared
      return !dragInProgress && !dragHold
    })
  }

  // Hide Alert by default.
  // Otherwise wait for Alert value to appear so that snapshots are consistent.
  if (!showAlert) {
    await hide('[data-testid="alert"]')
  }
}

export default dragAndDropThought
