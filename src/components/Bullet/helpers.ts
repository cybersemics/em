import Path from '../../@types/Path'
import { hasChildren } from '../../selectors/getChildren'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import durations from '../../util/durations'
import equalPath from '../../util/equalPath'
import head from '../../util/head'
import isDescendantPath from '../../util/isDescendantPath'
import parentOf from '../../util/parentOf'

const overlayAnimateDuration = {
  default: durations.get('veryFast'),
  layoutSlowShift: durations.get('layoutSlowShift'),
  layoutNodeAnimation: durations.get('layoutNodeAnimation'),
}

/**
 * Determines if the cursor is moving from a parent node to an uncle node.
 * @param params - The parameters for determining the movement.
 * @param params.prevCursor - The previous cursor path.
 * @param params.nextCursor - The next cursor path.
 * @returns True if moving from parent to uncle, false otherwise.
 */
const isMovingFromParentToUncle = ({ prevCursor, nextCursor }: { prevCursor: Path | null; nextCursor: Path }) => {
  if (!prevCursor) return false

  const prevCursorDepth = prevCursor.length - 1

  const nextCursorDepth = nextCursor.length - 1

  const hasSameDepth = prevCursorDepth === nextCursorDepth
  const hasSameParent = equalPath(parentOf(nextCursor), parentOf(prevCursor))

  const state = store.getState()
  const isPrevCursorWasParent = hasChildren(state, head(prevCursor))

  const prevCursorRank = getThoughtById(state, head(prevCursor))?.rank ?? 0
  const nextCursorRank = getThoughtById(state, head(nextCursor))?.rank ?? 0

  const isNextCursorHasBiggerRank = nextCursorRank > prevCursorRank

  return hasSameDepth && hasSameParent && isPrevCursorWasParent && isNextCursorHasBiggerRank
}

/**
 * Determines if the cursor is moving from a child to an uncle node.
 * @param prevCursor The previous cursor path.
 * @param nextCursor The next cursor path.
 * @returns True if moving from child to uncle, false otherwise.
 */
const isMovingFromChildToUncle = ({ prevCursor, nextCursor }: { prevCursor: Path | null; nextCursor: Path }) => {
  if (!prevCursor) {
    return false
  }

  const prevCursorDepth = prevCursor.length - 1

  const nextCursorDepth = nextCursor.length - 1

  // check if next cursor is the parent of the prev cursor

  const isMoveFromChildToParent = isDescendantPath(prevCursor, nextCursor)

  // check if the next cursor (uncle)
  const isNextCursorUncle = prevCursorDepth > nextCursorDepth

  return !isMoveFromChildToParent && isNextCursorUncle
}

/**
 * Determines if the cursor is moving from a parent node to a child node.
 * @param prevCursor The previous cursor path.
 * @param nextCursor The next cursor path.
 * @returns True if moving from parent to child, false otherwise.
 */
function isMovingFromParentToChild({ prevCursor, nextCursor }: { prevCursor: Path | null; nextCursor: Path }) {
  if (!prevCursor) {
    return false
  }

  const prevCursorDepth = prevCursor.length - 1
  const nextCursorDepth = nextCursor.length - 1
  const isNextCursorHasBiggerDepth = nextCursorDepth > prevCursorDepth

  return isNextCursorHasBiggerDepth
}

/**
 * Calculates the final duration for the bullet overlay animation based on cursor movement and state.
 * @param params - The parameters for determining the animation duration.
 * @param params.nextCursor - The next cursor path.
 * @param params.prevCursor - The previous cursor path.
 * @param params.isNextCursorHasIndent - Whether the next cursor has an indent.
 * @param params.firstRender - Whether this is the first render.
 * @param params.delay - Optional delay flag.
 * @returns The duration in milliseconds for the overlay animation.
 */
function getBulletOverlayFinalDuration({
  nextCursor,
  prevCursor,
  isNextCursorHasIndent,
  firstRender,
  delay = false,
}: {
  nextCursor: Path
  prevCursor: Path | null
  isNextCursorHasIndent: boolean
  firstRender: boolean
  delay?: boolean
}) {
  if (!prevCursor && firstRender) {
    return 780
  }

  // check if there's indent , change  final position at 750ms
  if (isNextCursorHasIndent) {
    return overlayAnimateDuration.layoutSlowShift
  }

  // check if indent cursor
  const isIndentCursor = isMovingFromParentToChild({ prevCursor, nextCursor })
  if (isIndentCursor) {
    return overlayAnimateDuration.layoutNodeAnimation
  }

  const isMovingFromParentToUncleResult = isMovingFromParentToUncle({ prevCursor, nextCursor })

  const isMovingFromChildToUncleResult = isMovingFromChildToUncle({ prevCursor, nextCursor })

  const isMoveToUncle = isMovingFromParentToUncleResult || isMovingFromChildToUncleResult

  if (isMoveToUncle) {
    const delayTime = delay ? 80 : 0
    return overlayAnimateDuration.layoutNodeAnimation + delayTime // adds extra 80ms to tackle delay happens during cursorNext by command.
  }

  return overlayAnimateDuration.default
}

export { isMovingFromParentToUncle, isMovingFromChildToUncle, isMovingFromParentToChild, getBulletOverlayFinalDuration }

export default {}
