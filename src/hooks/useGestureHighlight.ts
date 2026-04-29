import { useMemo } from 'react'
import Command from '../@types/Command'
import { gestureString } from '../commands'

/**
 * Returns how many gesture steps to highlight for a command row in the Gesture Menu,
 * based on the gesture the user is currently tracing.
 *
 * The return value drives the `highlight` prop on GestureDiagram — a higher number
 * illuminates more segments of the gesture path. `undefined` means no highlight at all
 * (used when the command is disabled or no gesture has started).
 *
 * Special cases:
 * - `openMobileCommandUniverse`: uses longest-suffix matching so it lights up even when
 * the universe-opener sequence appears at the end of a longer in-progress gesture.
 * - `cancel`: has no gesture path; shows a fixed highlight of 1 only when selected.
 *
 * @param command - The command whose gesture diagram to highlight.
 * @param gestureInProgress - The raw gesture string traced so far, or undefined if none active.
 * @param selected - Whether this row is the currently selected item in the menu.
 * @param disabled - When true, the command is unavailable and no highlight is shown.
 * @returns The number of highlighted gesture steps, or undefined to suppress highlighting.
 */
const useGestureHighlight = (
  command: Command,
  gestureInProgress: string | undefined,
  selected: boolean | undefined,
  disabled: boolean,
): number | undefined =>
  useMemo(() => {
    if (disabled || gestureInProgress === undefined) return undefined

    if (command.id === 'openMobileCommandUniverse') {
      const universeGesture = gestureString(command)

      // Scan from longest to shortest prefix of universeGesture, returning the first
      // (longest) one that the in-progress gesture ends with. This way the item starts
      // lighting up as soon as any trailing portion of its sequence is matched, even
      // if the user typed extra strokes before it.
      // e.g. universeGesture='rdld', gestureInProgress='urdld' → matches full length 4.
      // Falls back to 0 (no segments lit) rather than undefined so the row stays visible.
      return (
        [...universeGesture]
          .map((_, i) => universeGesture.length - i)
          .find(len => gestureInProgress.endsWith(universeGesture.slice(0, len))) ?? 0
      )
    }

    if (command.id === 'cancel') {
      // Cancel has no directional gesture path, so we can't match it against
      // gestureInProgress. Instead, highlight it with a fixed value of 1 only
      // while it is the actively selected row.
      return selected ? 1 : undefined
    }

    // For all other commands, every stroke traced so far counts as one highlighted
    // segment — the diagram lights up progressively as the user swipes.
    return gestureInProgress.length
  }, [disabled, gestureInProgress, command, selected])

export default useGestureHighlight
