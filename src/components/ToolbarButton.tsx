import React, { ComponentType, FC, MutableRefObject, RefObject, useCallback, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { toolbarPointerEventsRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import CommandId from '../@types/CommandId'
import CommandType from '../@types/CommandType'
import DragCommandZone from '../@types/DragCommandZone'
import IconType from '../@types/IconType'
import State from '../@types/State'
import { isTouch } from '../browser'
import { commandById, formatKeyboardShortcut } from '../commands'
import { executeCommandWithMulticursor } from '../commands'
import { TOOLBAR_BUTTON_PADDING, TOOLBAR_SWIPE_THRESHOLD } from '../constants'
import useDragAndDropToolbarButton from '../hooks/useDragAndDropToolbarButton'
import useLongPress from '../hooks/useLongPress'
import store from '../stores/app'
import commandStateStore from '../stores/commandStateStore'
import getCursorSortDirection from '../util/getCursorSortDirection'
import haptics from '../util/haptics'
import FormattingBarIcon from './FormattingBarIcon'

/** The light behind an active Formatting Bar button: a radial gradient with an approximately Gaussian falloff, drawn in place of the blurred disc in the design (see its use below). */
const FORMATTING_BAR_GLOW = `radial-gradient(closest-side, ${[30, 24.9, 14.6, 6, 0]
  .map(
    (alpha, i) => `color-mix(in srgb, ${token('colors.formattingBarHighlightGlow')} ${alpha}%, transparent) ${i * 25}%`,
  )
  .join(', ')})`

export interface ToolbarButtonProps {
  // see ToolbarProps.customize
  customize?: boolean
  disabled?: boolean
  fontSize: number
  /** Actual pixel icon dimensions for a specialized surface. Defaults to its font size. */
  iconSize?: number
  isPressing: boolean
  lastScrollLeft: MutableRefObject<number>
  onTapDown?: (id: CommandId, e: React.MouseEvent | React.TouchEvent) => void
  onTapUp?: (id: CommandId, e: React.MouseEvent | React.TouchEvent) => void
  onMouseLeave?: () => void
  selected?: boolean
  commandId: CommandId
  animated?: boolean
  /** Icon artwork supplied by a specialized surface, without the Toolbar's embedded picker. */
  icon?: ComponentType<IconType>
  /** Exposes the persistent button as the anchor for a separately rendered picker. */
  buttonRef?: RefObject<HTMLDivElement | null>
  /** The surface the button is rendered in, recorded as the command's input method. Defaults to the Toolbar. */
  type?: Extract<CommandType, 'toolbar' | 'formattingBar'>
}

/** A single button in the Toolbar. */
const ToolbarButton: FC<ToolbarButtonProps> = ({
  customize,
  disabled,
  fontSize,
  iconSize = fontSize,
  isPressing,
  lastScrollLeft,
  onTapDown,
  onTapUp,
  onMouseLeave,
  selected,
  commandId,
  icon,
  buttonRef,
  type = 'toolbar',
}) => {
  const [isAnimated, setIsAnimated] = useState(false)

  /** Tracks if long press was activated and the command has a longPress handler. Used to show the UndoSlider when the Undo or Redo toolbar buttons are long pressed. */
  const isPressedRef = useRef(false)

  /** Tracks if mousedown occurred on this button, independent of React's render cycle. This prevents a race condition where the React-prop isPressing (derived from the parent Toolbar's pressingToolbarId state) hasn't updated between mousedown and click events dispatched in rapid succession (e.g. by Puppeteer under CI load). */
  const isMouseDownRef = useRef(false)

  /** The clientX of the touch when it started, used to detect a swipe by horizontal finger travel. Null when no touch is in progress. */
  const touchStartXRef = useRef<number | null>(null)

  /** Tracks whether the finger has moved horizontally past the swipe threshold during the current touch. Set during touchmove so that a swipe is detected directly from finger travel, independent of whether the toolbar was actually able to scroll. This catches a swipe at a scroll boundary (e.g. scrollLeft === 0 on swipe right), where scrollLeft cannot change. */
  const touchMovedRef = useRef(false)

  const command = commandById(commandId)
  if (!command) {
    console.error('Missing command: ' + commandId)
  }
  const { svg: DefaultIcon, isActive, canExecute } = command
  const SVG = icon ?? DefaultIcon

  // Determine if the button should be shown in an active state. Precedence is as follows:
  // 1. If customize toolbar, use selected state.
  // 2. If a formatting command, use the command state (i.e. bold, italic, underline, strikethrough).
  // 3. Otherwise, use the command's isActive method.
  const commandState = commandStateStore.useSelector(
    state => state[commandId as keyof typeof state] as boolean | undefined,
  )
  const isCommandActive = useSelector(state => !isActive || isActive(state))
  const isPickerOpen = useSelector(state => !!command.isDropdownOpen?.(state) && state.dropdownHost === type)
  const isButtonActive = customize
    ? selected
    : commandState !== undefined
      ? commandState
      : // In the Formatting Bar, a picker button is highlighted while its picker is open. Its isActive is true whenever
        // it can be used, which would highlight it permanently.
        type === 'formattingBar' && command.isDropdownOpen
        ? isPickerOpen
        : isCommandActive

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
      // React propagates events through portals, so a tap on a picker that the Formatting Bar portals out of this
      // button arrives here without having touched the button.
      if (!e.currentTarget.contains(e.target as Node)) return
      longPress.props[isTouch ? 'onTouchEnd' : 'onMouseUp']?.()
      const wasMouseDown = isMouseDownRef.current
      isMouseDownRef.current = false
      const iconEl = e.target as HTMLElement
      const toolbarEl = iconEl.closest('[data-toolbar-scroll-container]')!
      // A swipe is detected either by the toolbar's scrollLeft changing, or by the finger moving
      // horizontally past the threshold (tracked in tapMove). The finger-travel check is necessary
      // at a scroll boundary (e.g. scrollLeft === 0 on swipe right, or scrollLeft === max on swipe
      // left), where the toolbar cannot scroll, so the scroll-delta check alone would treat the
      // swipe as a tap and fire the button under the finger.
      const fingerMoved = isTouch && touchMovedRef.current
      const scrolled = isTouch && (Math.abs(lastScrollLeft.current - toolbarEl.scrollLeft) >= 5 || fingerMoved)

      touchStartXRef.current = null
      touchMovedRef.current = false

      const isTap = !customize && !scrolled && (isPressing || wasMouseDown)

      if (isTap && isButtonExecutable && !disabled) {
        haptics.light()

        if (!isPressedRef.current) {
          executeCommandWithMulticursor(command, { store, type, event: e })

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
      }

      // Prevent Editable blur. Not gated on the command being executable, since tapping a disabled button should do
      // nothing at all, including closing the keyboard.
      if (isTap && isTouch) {
        e.preventDefault()
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
      type,
    ],
  )

  /** Handles the onMouseDown/onTouchEnd event. Updates lastScrollPosition for tapUp. */
  const tapDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // See tapUp.
      if (!e.currentTarget.contains(e.target as Node)) return
      isMouseDownRef.current = true
      const iconEl = e.target as HTMLElement
      const toolbarEl = iconEl.closest('[data-toolbar-scroll-container]')!
      longPressTapDown?.(e)

      // Record the touch's starting clientX so tapMove can detect a swipe by finger travel, independent
      // of scroll position. Only set for touch events (the finger-travel path is inherently touch-only).
      touchStartXRef.current = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : null
      touchMovedRef.current = false

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

  /** Handles the onTouchMove event. Flags the interaction as a swipe once the finger has traveled past the threshold, so tapUp can suppress the button command even when the toolbar is at a scroll boundary and cannot scroll. */
  const tapMove = useCallback((e: React.TouchEvent) => {
    if (touchMovedRef.current || touchStartXRef.current === null || e.touches.length === 0) return
    if (Math.abs(e.touches[0].clientX - touchStartXRef.current) >= TOOLBAR_SWIPE_THRESHOLD) {
      touchMovedRef.current = true
    }
  }, [])

  const style = useMemo(
    () => ({
      fill: buttonError
        ? token('colors.red')
        : isDragging
          ? undefined
          : // The Formatting Bar shows the active state with a highlight behind the icon rather than with the fill.
            type === 'formattingBar' && isButtonExecutable
            ? token('colors.formattingBarIcon')
            : isButtonExecutable && isButtonActive
              ? token('colors.fg')
              : token('colors.gray50'), // keep fill in style because some icons need the exact color
      width: fontSize + 4,
      height: fontSize + 4,
    }),
    [buttonError, fontSize, isButtonActive, isButtonExecutable, isDragging, type],
  )
  return (
    <div
      {...longPress.props}
      aria-label={command.label}
      data-testid='toolbar-icon'
      data-active={isButtonActive}
      ref={node => {
        if (buttonRef) buttonRef.current = node
        dragSource(dropTarget(node))
      }}
      key={commandId}
      title={`${command.label}${(command.overlay?.keyboard ?? command.keyboard) ? ` (${formatKeyboardShortcut((command.overlay?.keyboard ?? command.keyboard)!)})` : ''}${buttonError ? '\nError: ' + buttonError : ''}`}
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
        // The Formatting Bar centers its buttons vertically, so they need no top padding.
        padding: `${type === 'formattingBar' ? 0 : 14}px ${TOOLBAR_BUTTON_PADDING}px ${isDraggingAny ? '7em' : 0}px ${TOOLBAR_BUTTON_PADDING}px`,
        // In the Formatting Bar, the button fills the height of the bar, so that a tap near the icon presses it.
        ...(type === 'formattingBar'
          ? {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              flex: 1,
              minWidth: 0,
              maxWidth: 'none',
              padding: 0,
            }
          : null),
      }}
      onMouseLeave={() => {
        isMouseDownRef.current = false
        onMouseLeave?.()
      }}
      onMouseDown={isTouch ? undefined : tapDown}
      onClick={isTouch ? undefined : tapUp}
      onTouchStart={isTouch ? tapDown : undefined}
      onTouchMove={isTouch ? tapMove : undefined}
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
      {
        // Formatting Bar active highlight: a soft disc of light behind the icon. The Figma design is a 24px disc with a
        // layer blur of 36 and a hard-light blend. That is drawn as a radial gradient following the same falloff instead,
        // since WebKit clips a blurred, blended element to a hard-edged rectangle of light.
        type === 'formattingBar' && (
          <div
            className={css({
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              transition: 'opacity {durations.fast} ease-out',
            })}
            style={{
              width: iconSize * 4.85,
              height: iconSize * 4.85,
              background: FORMATTING_BAR_GLOW,
              // Dimmed slightly from the design, which read as too bright on device.
              opacity: isButtonActive ? 0.875 : 0,
            }}
          />
        )
      }
      {type === 'formattingBar' ? (
        <FormattingBarIcon
          Icon={SVG}
          size={iconSize}
          style={style}
          animated={isAnimated}
          animationComplete={() => setIsAnimated(false)}
        />
      ) : (
        <SVG
          size={fontSize}
          cssRaw={css.raw({
            position: 'relative' as const,
            // Animated icons replace their SVG when they finish. Keep the touch target on the persistent
            // button so a replacement mid-press cannot lose touchend and let WebKit blur the editable.
            pointerEvents: 'none',
            cursor: isButtonExecutable ? 'pointer' : 'default',
            opacity: dropToRemove ? 0 : 1,
            transition: 'opacity {durations.fast} ease-out',
          })}
          style={style}
          animated={isAnimated}
          animationComplete={() => setIsAnimated(false)}
        />
      )}
    </div>
  )
}

export default ToolbarButton
