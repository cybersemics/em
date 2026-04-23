import { useMemo } from 'react'
import Command from '../@types/Command'
import { gestureString } from '../commands'

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
      return (
        [...universeGesture]
          .map((_, i) => universeGesture.length - i)
          .find(len => gestureInProgress.endsWith(universeGesture.slice(0, len))) ?? 0
      )
    }
    if (command.id === 'cancel') {
      return selected ? 1 : undefined
    }
    return gestureInProgress.length
  }, [disabled, gestureInProgress, command, selected])

export default useGestureHighlight
