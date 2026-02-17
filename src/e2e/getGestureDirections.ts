import Command from '../@types/Command'
import Direction from '../@types/Direction'
import GesturePath from '../@types/GesturePath'
import isCommand from '../util/isCommand'

/**
 * Resolves a gesture input (Command, GesturePath, or GesturePath[]) to a sequence of directions.
 * Used by both iOS and puppeteer gesture helpers so resolution logic stays in one place.
 * - Command: uses command.gesture; if array, uses first path.
 * - GesturePath[]: uses first path.
 * - GesturePath: used as-is.
 */
const getGestureDirections = (gestureOrCommand: GesturePath | GesturePath[] | Command): Direction[] => {
  if (isCommand(gestureOrCommand) && !gestureOrCommand.gesture) {
    throw new Error(
      `Command "${gestureOrCommand.id}" does not have a gesture defined so cannot be activated with swipe.`,
    )
  }

  let gesturePath: GesturePath
  if (isCommand(gestureOrCommand)) {
    const g = gestureOrCommand.gesture!
    gesturePath = Array.isArray(g) ? g[0] : g
  } else if (Array.isArray(gestureOrCommand)) {
    gesturePath = gestureOrCommand[0]
  } else {
    gesturePath = gestureOrCommand
  }

  return typeof gesturePath === 'string' ? (gesturePath.split('') as Direction[]) : gesturePath
}

export default getGestureDirections
