import React, { FC, MutableRefObject, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import DragShortcutZone from '../@types/DragShortcutZone'
import Icon from '../@types/Icon'
import ShortcutId from '../@types/ShortcutId'
import { isTouch } from '../browser'
import useDragAndDropToolbarButton from '../hooks/useDragAndDropToolbarButton'
import useToolbarLongPress from '../hooks/useToolbarLongPress'
import themeColors from '../selectors/themeColors'
import { shortcutById } from '../shortcuts'
import store from '../stores/app'
import commandStateStore from '../stores/commandStateStore'
import fastClick from '../util/fastClick'

export interface ToolbarButtonProps {
  // see ToolbarProps.customize
  customize?: boolean
  disabled?: boolean
  fontSize: number
  isPressing: boolean
  lastScrollLeft: MutableRefObject<number>
  onTapDown?: (id: ShortcutId, e: React.MouseEvent | React.TouchEvent) => void
  onTapUp?: (id: ShortcutId, e: React.MouseEvent | React.TouchEvent) => void
  onMouseLeave?: () => void
  selected?: boolean
  shortcutId: ShortcutId
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
  shortcutId,
}) => {
  const colors = useSelector(themeColors)
  const shortcut = shortcutById(shortcutId)
  if (!shortcut) {
    throw new Error('Missing shortcut: ' + shortcutId)
  }
  const { svg, exec, isActive, canExecute } = shortcut

  if (!svg) {
    throw new Error('The svg property is required to render a shortcut in the Toolbar. ' + shortcutId)
  }

  // Determine if the button should be shown in an active state. Precedence is as follows:
  // 1. If customize toolbar, use selected state.
  // 2. If a formatting command, use the command state (i.e. bold, italic, underline, strikethrough).
  // 3. Otherwise, use the shortcut's isActive method.
  const commandState = commandStateStore.useSelector(
    state => state[shortcutId as keyof typeof state] as boolean | undefined,
  )
  const isShortcutActive = useSelector(state => !isActive || isActive(() => state))
  const isButtonActive = customize ? selected : commandState !== undefined ? commandState : isShortcutActive

  const dragShortcutZone = useSelector(state => state.dragShortcutZone)
  const isDraggingAny = useSelector(state => !!state.dragShortcut)
  const buttonError = useSelector(state => (!customize && shortcut.error ? shortcut.error(() => state) : null))
  const isButtonExecutable = useSelector(state => customize || !canExecute || canExecute(() => state))
  const { isDragging, dragSource, isHovering, dropTarget } = useDragAndDropToolbarButton({ shortcutId, customize })
  const dropToRemove = isDragging && dragShortcutZone === DragShortcutZone.Remove
  const longPress = useToolbarLongPress({
    disabled: !customize,
    isDragging,
    shortcut,
    sourceZone: DragShortcutZone.Toolbar,
  })
  const longPressTapUp = longPress.props[isTouch ? 'onTouchEnd' : 'onMouseUp']
  const longPressTapDown = longPress.props[isTouch ? 'onTouchStart' : 'onMouseDown']
  const longPressTouchMove = longPress.props.onTouchMove

  // TODO: type svg correctly
  const SVG = svg as React.FC<Icon>

  /** Handles the onMouseUp/onTouchEnd event. Makes sure that we are actually clicking and not scrolling the toolbar. */
  const tapUp = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      longPress.props[isTouch ? 'onTouchEnd' : 'onMouseUp'](e)
      const iconEl = e.target as HTMLElement
      const toolbarEl = iconEl.closest('.toolbar')!
      const scrolled = isTouch && Math.abs(lastScrollLeft.current - toolbarEl.scrollLeft) >= 5
      if (!customize && isButtonExecutable && !disabled && !scrolled && isPressing) {
        exec(store.dispatch, store.getState, e, { type: 'toolbar' })

        // prevent Editable blur
        if (isTouch) {
          e.preventDefault()
        }
      }

      lastScrollLeft.current = toolbarEl.scrollLeft

      if (!disabled) {
        onTapUp?.(shortcutId, e)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [longPressTapUp, customize, isButtonExecutable, disabled, isPressing, onTapUp],
  )

  /** Handles the onMouseDown/onTouchEnd event. Updates lastScrollPosition for tapUp. */
  const tapDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const iconEl = e.target as HTMLElement
      const toolbarEl = iconEl.closest('.toolbar')!
      longPressTapDown(e)

      lastScrollLeft.current = toolbarEl.scrollLeft

      if (!disabled) {
        onTapDown?.(shortcutId, e)
      }

      if (!customize && !isTouch) {
        e.preventDefault()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [longPressTapDown, customize, disabled],
  )

  /** Handles the tapCancel. */
  const touchMove = useCallback(longPressTouchMove, [longPressTouchMove])

  const style = useMemo(
    () => ({
      position: 'relative' as const,
      cursor: isButtonExecutable ? 'pointer' : 'default',
      fill: buttonError
        ? colors.red
        : longPress.isPressed || isDragging
          ? undefined
          : isButtonExecutable && isButtonActive
            ? colors.fg
            : 'gray',
      width: fontSize + 4,
      height: fontSize + 4,
      opacity: dropToRemove ? 0 : 1,
      transition: 'opacity 200ms ease-out',
    }),
    [buttonError, colors, dropToRemove, fontSize, isButtonActive, isButtonExecutable, isDragging, longPress.isPressed],
  )

  return (
    <div
      {...longPress.props}
      aria-label={shortcut.label}
      ref={node => dragSource(dropTarget(node))}
      key={shortcutId}
      title={`${shortcut.label}${buttonError ? '\nError: ' + buttonError : ''}`}
      style={{
        // animate maxWidth to avoid having to know the exact width of the toolbar icon
        // maxWidth just needs to exceed the width
        maxWidth: fontSize * 2,
        ...(dropToRemove
          ? {
              // offset 1toolbar-icon padding
              marginLeft: -10,
              maxWidth: 10,
            }
          : null),
        // offset top to avoid changing container height
        // marginBottom: isPressing ? -10 : 0,
        // top: isButtonExecutable && isPressing ? 10 : 0,
        transform: `translateY(${isButtonExecutable && isPressing && !longPress.isPressed && !isDragging ? 0.25 : 0}em`,
        position: 'relative',
        cursor: isButtonExecutable ? 'pointer' : 'default',
        transition: 'transform 80ms ease-out, max-width 80ms ease-out, margin-left 80ms ease-out',
        // extend drop area down, otherwise the drop hover is blocked by the user's finger
        // must match toolbar marginBottom
        paddingBottom: isDraggingAny ? '7em' : 0,
      }}
      className='toolbar-icon'
      onMouseLeave={onMouseLeave}
      {...fastClick(tapUp, tapDown, undefined, touchMove)}
    >
      {
        // selected top dash
        selected && !dropToRemove ? (
          <div style={{ height: 2, backgroundColor: colors.highlight, width: fontSize }}></div>
        ) : null
      }

      {
        // drag-and-drop circle overlay
        (longPress.isPressed || isDragging) && !dropToRemove && (
          <div
            style={{
              borderRadius: 999,
              width: fontSize * 1.75,
              height: fontSize * 1.75,
              backgroundColor: colors.gray33,
              position: 'absolute',
              top: 9,
              left: 2,
            }}
          />
        )
      }

      {
        // drop hover
        (isHovering || dropToRemove) && (
          <div
            style={{
              borderRight: dropToRemove ? `dashed 1px ${colors.gray}` : undefined,
              position: 'absolute',
              top: fontSize / 2 + 3,
              left: dropToRemove ? 15 : -2,
              // match the height of the inverted button
              height: fontSize * 1.5,
              width: dropToRemove ? 2 : 3,
              // dropToRemove uses dashed border instead of background color
              backgroundColor: dropToRemove ? undefined : colors.highlight,
            }}
          />
        )
      }
      <SVG size={fontSize} style={style} />
    </div>
  )
}

export default ToolbarButton
