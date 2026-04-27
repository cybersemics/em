import { useEffect, useMemo, useRef } from 'react'
import { DragSourceMonitor, useDrag } from 'react-dnd'
import { useSelector } from 'react-redux'
import Command from '../@types/Command'
import DragAndDropType from '../@types/DragAndDropType'
import DragCommandZone from '../@types/DragCommandZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import State from '../@types/State'
import { dragCommandActionCreator as dragCommand } from '../actions/dragCommand'
import { gestureString } from '../commands'
import { noop } from '../constants'
import store from '../stores/app'
import useLottieIntervalAnimation from './useLottieIntervalAnimation'

/** Returns true if the command can be executed in the current state. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

interface UseCommandItemArgs {
  command: Command
  selected?: boolean
  customize?: boolean
  gestureInProgress?: string
  shouldScrollSelectedIntoView?: boolean
  isFirstCommand?: boolean
  isLastCommand?: boolean
  /** Pass true to enable the lottie animation pulse on selection. The CommandItem variants only animate when an icon is present and the device isn't touch. */
  animateOnSelect?: boolean
}

interface UseCommandItemReturn {
  /** Combined ref that connects the drag source and scrolls the element into view when selected (when shouldScrollSelectedIntoView is set). */
  setRef: (current: HTMLElement | null) => void
  isDragging: boolean
  isSelectedStyle: boolean
  disabled: boolean
  isActive: boolean | undefined
  label: string
  description: string | undefined
  isAnimated: boolean
  onAnimationComplete: () => void
  /** First N segments of the gesture diagram to highlight, or undefined to show none. */
  gestureHighlight: number | undefined
}

/** Shared logic for the CommandItem variants (CommandTableItem, CommandUniverseGridItem). Owns the drag source, executability, description, lottie animation, gesture-progress highlight, and the scroll-into-view effect. Variants supply their own markup. */
const useCommandItem = ({
  command,
  selected,
  customize,
  gestureInProgress,
  shouldScrollSelectedIntoView,
  isFirstCommand,
  isLastCommand,
  animateOnSelect,
}: UseCommandItemArgs): UseCommandItemReturn => {
  const ref = useRef<HTMLElement | null>(null)

  const [{ isDragging }, dragSource] = useDrag({
    type: DragAndDropType.ToolbarButton,
    item: (): DragToolbarItem => {
      store.dispatch(dragCommand(command?.id || null))
      return { command: command, zone: DragCommandZone.Remove }
    },
    canDrag: () => !!command && !!customize,
    end: () => store.dispatch(dragCommand(null)),
    collect: (monitor: DragSourceMonitor) => {
      const item = monitor.getItem() as DragToolbarItem
      return {
        dragPreview: noop,
        isDragging: monitor.isDragging(),
        zone: item?.zone,
      }
    },
  })

  const isActive = command.isActive?.(store.getState())
  const disabled = useSelector(state => !isExecutable(state, command))

  const label = command.labelInverse && isActive ? command.labelInverse : command.label

  const { isAnimated, onAnimationComplete } = useLottieIntervalAnimation({
    enabled: !!animateOnSelect && !!selected,
  })

  const description = useSelector(state => {
    const descriptionStringOrFunction = (isActive && command.descriptionInverse) || command.description
    return typeof descriptionStringOrFunction === 'function'
      ? descriptionStringOrFunction(state)
      : descriptionStringOrFunction
  })

  const isSelectedStyle = !!(selected || isDragging)

  useEffect(() => {
    if (!selected || !shouldScrollSelectedIntoView) return
    if (!isFirstCommand && !isLastCommand) {
      ref.current?.scrollIntoView({ block: 'nearest' })
      return
    }
    const scrollContainer = ref.current?.parentElement
    if (scrollContainer) {
      scrollContainer.scrollTop = isFirstCommand ? 0 : scrollContainer.scrollHeight
    }
  })

  const gestureHighlight = useMemo(() => {
    if (disabled || gestureInProgress === undefined) return undefined
    if (command.id === 'openMobileCommandUniverse') {
      const mobileCommandUniverseGesture = gestureString(command)
      return (
        [...mobileCommandUniverseGesture]
          .map((_, i) => mobileCommandUniverseGesture.length - i)
          .find(len => gestureInProgress.endsWith(mobileCommandUniverseGesture.slice(0, len))) ?? 0
      )
    }
    if (command.id === 'cancel') {
      return selected ? 1 : undefined
    }
    return gestureInProgress.length
  }, [disabled, gestureInProgress, command, selected])

  /** Combined ref callback that connects the drag source and stores the element for the scroll-into-view effect. */
  const setRef = (current: HTMLElement | null) => {
    ref.current = current
    dragSource(current)
  }

  return {
    setRef,
    isDragging,
    isSelectedStyle,
    disabled,
    isActive,
    label,
    description,
    isAnimated,
    onAnimationComplete,
    gestureHighlight,
  }
}

export default useCommandItem
