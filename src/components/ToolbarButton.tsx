import React, { FC, MutableRefObject, useCallback, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { toolbarPointerEventsRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import CommandId from '../@types/CommandId'
import DragCommandZone from '../@types/DragCommandZone'
import State from '../@types/State'
import { isTouch } from '../browser'
import { commandById, formatKeyboardShortcut } from '../commands'
import { executeCommandWithMulticursor } from '../commands'
import { TOOLBAR_BUTTON_PADDING } from '../constants'
import useDragAndDropToolbarButton from '../hooks/useDragAndDropToolbarButton'
import useLongPress from '../hooks/useLongPress'
import store from '../stores/app'
import commandStateStore from '../stores/commandStateStore'
import dndRef from '../util/dndRef'
import getCursorSortDirection from '../util/getCursorSortDirection'
import haptics from '../util/haptics'

export interface ToolbarButtonProps {
  // see ToolbarProps.customize
  customize?: boolean
  disabled?: boolean
  fontSize: number
  isPressing: boolean
  lastScrollLeft: MutableRefObject<number>
  onTapDown?: (id: CommandId, e: React.MouseEvent | React.TouchEvent) => void
  onTapUp?: (id: CommandId, e: React.MouseEvent | React.TouchEvent) => void
  onMouseLeave?: () => void
  selected?: boolean
  commandId: CommandId
  animated?: boolean
}

/** A single button in the Toolbar. */
const ToolbarButton: FC<ToolbarButtonProps> = ({
  customize,
  disabled,
  fontSize,
  isPressing,
  lastScrollLeft,
  onTapDown,
  onTapUp,
  onMouseLeave,
  selected,
  commandId,
}) => {
  const [isAnimated, setIsAnimated] = useState(false)

  /** Tracks if long press was activated and the command has a longPress handler. Used to show the UndoSlider when the Undo or Redo toolbar buttons are long pressed. */
  const isPressedRef = useRef(false)

  const command = commandById(commandId)
  if (!command) {
    console.error('Missing command: ' + commandId)
  }
  const { svg: SVG, isActive, canExecute } = command

  // Determine if the button should be shown in an active state. Precedence is as follows:
  // 1. If customize toolbar, use selected state.
  // 2. If a formatting command, use the command state (i.e. bold, italic, underline, strikethrough).
  // 3. Otherwise, use the command's isActive method.
  const commandState = commandStateStore.useSelector(
    state => state[commandId as keyof typeof state] as boolean | undefined,
  )
  const isCommandActive = useSelector(state => !isActive || isActive(state))
  const isButtonActive = customize ? selected : commandState !== undefined ? commandState : isCommandActive

  const dragCommandZone = useSelector(state => state.dragCommandZone)
  const isDraggingAny = useSelector(state => !!state.dragCommand)
  const buttonError = useSelector(state => (!customize && command.error ? command.error(state) : null))
  const isButtonExecutable = useSelector(state => customize || !canExecute || canExecute(state))

  const { isDragging, dragSource, isHovering, dropTarget } = useDragAndDropToolbarButton({
    commandId,
    customize,
  })
  const dropToRemove = isDragging && dragCommandZone === DragCommandZone.Remove
  const longPress = {
    props: useLongPress(
      () => {
        if (command.longPress) {
          isPressedRef.current = true
          command.longPress?.(store.dispatch)
        }
      },
      () => {
        isPressedRef.current = false
      },
      800,
    ),
  }
  const longPressTapUp = longPress.props[isTouch ? 'onTouchEnd' : 'onMouseUp']
  const longPressTapDown = longPress.props[isTouch ? 'onTouchStart' : 'onMouseDown']

  if (!SVG) {
    console.error('Cannot render toolbar button without an SVG icon:', commandId)
    return null
  }

  // Get the direction if the command is 'toggleSort'
  const direction = useSelector((state: State) => {
    if (commandId !== 'toggleSort') return null
    return getCursorSortDirection(state)
  })

  /** Handles the onMouseUp/onTouchEnd event. Makes sure that we are actually clicking and not scrolling the toolbar. */
  const tapUp = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      longPress.props[isTouch ? 'onTouchEnd' : 'onMouseUp']?.()
      const iconEl = e.target as HTMLElement
      const toolbarEl = iconEl.closest('#toolbar')!
      const scrolled = isTouch && Math.abs(lastScrollLeft.current - toolbarEl.scrollLeft) >= 5

      if (!customize && isButtonExecutable && !disabled && !scrolled && isPressing) {
        haptics.light()

        if (!isPressedRef.current) {
          executeCommandWithMulticursor(command, { store, type: 'toolbar', event: e })

          // only animate from inactive -> active
          // only animate toggleSort from Manual -> Asc or Asc to Desc
          setIsAnimated(
            commandId === 'toggleSort'
              ? direction === null || direction === 'Asc'
              : isActive
                ? !isButtonActive
                : !commandState,
          )
        }

        // prevent Editable blur
        if (isTouch) {
          e.preventDefault()
        }
      }

      lastScrollLeft.current = toolbarEl.scrollLeft

      if (!disabled) {
        onTapUp?.(commandId, e)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      longPressTapUp,
      customize,
      isButtonExecutable,
      disabled,
      isPressing,
      onTapUp,
      lastScrollLeft,
      isActive,
      commandState,
      isButtonActive,
      setIsAnimated,
      isAnimated,
    ],
  )

  /** Handles the onMouseDown/onTouchEnd event. Updates lastScrollPosition for tapUp. */
  const tapDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const iconEl = e.target as HTMLElement
      const toolbarEl = iconEl.closest('#toolbar')!
      longPressTapDown?.(e)

      lastScrollLeft.current = toolbarEl.scrollLeft

      if (!disabled) {
        haptics.medium()
        onTapDown?.(commandId, e)
      }

      if (!customize && !isTouch) {
        e.preventDefault()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [longPressTapDown, customize, disabled, isButtonActive, setIsAnimated, isActive],
  )

  const style = useMemo(
    () => ({
      fill: buttonError
        ? token('colors.red')
        : isDragging
          ? undefined
          : isButtonExecutable && isButtonActive
            ? token('colors.fg')
            : token('colors.gray50'), // keep fill in style because some icons need the exact color
      width: fontSize + 4,
      height: fontSize + 4,
    }),
    [buttonError, fontSize, isButtonActive, isButtonExecutable, isDragging],
  )
  return (
    <div
      {...longPress.props}
      aria-label={command.label}
      data-testid='toolbar-icon'
      ref={dndRef(node => dragSource(dropTarget(node)))}
      key={commandId}
      title={`${command.label}${(command.keyboard ?? command.overlay?.keyboard) ? ` (${formatKeyboardShortcut((command.keyboard ?? command.overlay?.keyboard)!)})` : ''}${buttonError ? '\nError: ' + buttonError : ''}`}
      className={cx(
        // Override the Toolbar's pointer-events: none to restore pointer behavior.
        toolbarPointerEventsRecipe({ override: true }),
        css({
          display: 'inline-block',
          borderRadius: '3px',
          zIndex: 'stack',
          // animate maxWidth to avoid having to know the exact width of the toolbar icon
          // maxWidth just needs to exceed the width
          maxWidth: fontSize * 2,
          ...(dropToRemove
            ? {
                // offset toolbar-icon padding
                marginLeft: -10,
                maxWidth: 10,
              }
            : null),
          // offset top to avoid changing container height
          // marginBottom: isPressing ? -10 : 0,
          // top: isButtonExecutable && isPressing ? 10 : 0,
          transform: isButtonExecutable && isPressing && !isDragging ? `translateY(0.25em)` : `translateY(0em)`,
          position: 'relative',
          cursor: isButtonExecutable ? 'pointer' : 'default',
          transition:
            'transform {durations.veryFast} ease-out, max-width {durations.veryFast} ease-out, margin-left {durations.veryFast} ease-out',
        }),
      )}
      style={{
        // extend drop area down, otherwise the drop hover is blocked by the user's finger
        // must match toolbar marginBottom
        padding: `14px ${TOOLBAR_BUTTON_PADDING}px ${isDraggingAny ? '7em' : 0}px ${TOOLBAR_BUTTON_PADDING}px`,
      }}
      onMouseLeave={onMouseLeave}
      onMouseDown={isTouch ? undefined : tapDown}
      onClick={isTouch ? undefined : tapUp}
      onTouchStart={isTouch ? tapDown : undefined}
      onTouchEnd={isTouch ? tapUp : undefined}
    >
      {
        // selected top dash
        selected && !dropToRemove ? (
          <div className={css({ height: 2, backgroundColor: 'highlight' })} style={{ width: fontSize }}></div>
        ) : null
      }

      {
        // drag-and-drop circle overlay
        isDragging && !dropToRemove && (
          <div
            className={css({
              borderRadius: 999,
              backgroundColor: 'gray33',
              position: 'absolute',
              top: 9,
              left: 2,
            })}
            style={{ width: fontSize * 1.75, height: fontSize * 1.75 }}
          />
        )
      }

      {
        // drop hover
        (isHovering || dropToRemove) && (
          <div
            className={css({
              borderRight: dropToRemove ? `dashed 1px {colors.gray66}` : undefined,
              position: 'absolute',
              left: dropToRemove ? 15 : -2,
              // match the height of the inverted button
              width: dropToRemove ? 2 : 3,
              // dropToRemove uses dashed border instead of background color
              backgroundColor: dropToRemove ? undefined : 'highlight',
            })}
            style={{ top: fontSize / 2 + 3, height: fontSize * 1.5 }}
          />
        )
      }
      <SVG
        size={fontSize}
        cssRaw={css.raw({
          position: 'relative' as const,
          cursor: isButtonExecutable ? 'pointer' : 'default',
          opacity: dropToRemove ? 0 : 1,
          transition: 'opacity {durations.fast} ease-out',
        })}
        style={style}
        animated={isAnimated}
        animationComplete={() => setIsAnimated(false)}
      />
    </div>
  )
}

export default ToolbarButton
