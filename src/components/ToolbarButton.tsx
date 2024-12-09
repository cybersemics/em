import React, { FC, MutableRefObject, useCallback, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { toolbarPointerEvents } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import DragShortcutZone from '../@types/DragShortcutZone'
import Icon from '../@types/IconType'
import ShortcutId from '../@types/ShortcutId'
import { isTouch } from '../browser'
import useDragAndDropToolbarButton from '../hooks/useDragAndDropToolbarButton'
import useToolbarLongPress from '../hooks/useToolbarLongPress'
import { formatKeyboardShortcut, shortcutById } from '../shortcuts'
import store from '../stores/app'
import commandStateStore from '../stores/commandStateStore'
import { executeShortcutWithMulticursor } from '../util/executeShortcut'
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
  shortcutId,
}) => {
  const [isAnimated, setIsAnimated] = useState(false)

  const shortcut = shortcutById(shortcutId)
  if (!shortcut) {
    console.error('Missing shortcut: ' + shortcutId)
  }
  const { svg, isActive, canExecute } = shortcut

  // Determine if the button should be shown in an active state. Precedence is as follows:
  // 1. If customize toolbar, use selected state.
  // 2. If a formatting command, use the command state (i.e. bold, italic, underline, strikethrough).
  // 3. Otherwise, use the shortcut's isActive method.
  const commandState = commandStateStore.useSelector(
    state => state[shortcutId as keyof typeof state] as boolean | undefined,
  )
  const isShortcutActive = useSelector(state => !isActive || isActive(state))
  const isButtonActive = customize ? selected : commandState !== undefined ? commandState : isShortcutActive

  const dragShortcutZone = useSelector(state => state.dragShortcutZone)
  const isDraggingAny = useSelector(state => !!state.dragShortcut)
  const buttonError = useSelector(state => (!customize && shortcut.error ? shortcut.error(state) : null))
  const isButtonExecutable = useSelector(state => customize || !canExecute || canExecute(state))

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
      const toolbarEl = iconEl.closest('#toolbar')!
      const scrolled = isTouch && Math.abs(lastScrollLeft.current - toolbarEl.scrollLeft) >= 5

      if (!customize && isButtonExecutable && !disabled && !scrolled && isPressing) {
        executeShortcutWithMulticursor(shortcut, { store, type: 'toolbar', event: e })

        if ((!isActive && !commandState) || (isActive && (!isButtonActive || shortcutId === 'toggleSort'))) {
          setIsAnimated(true)
        } else {
          setIsAnimated(false)
        }

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
    [longPressTapDown, customize, disabled, isButtonActive, setIsAnimated, isActive],
  )

  /** Handles the tapCancel. */
  const touchMove = useCallback(longPressTouchMove, [longPressTouchMove])

  const style = useMemo(
    () => ({
      fill: buttonError
        ? token('colors.red')
        : longPress.isPressed || isDragging
          ? undefined
          : isButtonExecutable && isButtonActive
            ? token('colors.fg')
            : token('colors.gray50'), // keep fill in style because some icons need the exact color
      width: fontSize + 4,
      height: fontSize + 4,
    }),
    [buttonError, fontSize, isButtonActive, isButtonExecutable, isDragging, longPress.isPressed],
  )
  return (
    <div
      {...longPress.props}
      aria-label={shortcut.label}
      data-testid='toolbar-icon'
      ref={node => dragSource(dropTarget(node))}
      key={shortcutId}
      title={`${shortcut.label}${(shortcut.keyboard ?? shortcut.overlay?.keyboard) ? ` (${formatKeyboardShortcut((shortcut.keyboard ?? shortcut.overlay?.keyboard)!)})` : ''}${buttonError ? '\nError: ' + buttonError : ''}`}
      className={cx(
        // Override the Toolbar's pointer-events: none to restore pointer behavior.
        toolbarPointerEvents({ override: true }),
        css({
          display: 'inline-block',
          padding: '14px 8px 5px 8px',
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
          transform:
            isButtonExecutable && isPressing && !longPress.isPressed && !isDragging
              ? `translateY(0.25em)`
              : `translateY(0em)`,
          position: 'relative',
          cursor: isButtonExecutable ? 'pointer' : 'default',
          transition:
            'transform {durations.veryFastDuration} ease-out, max-width {durations.veryFastDuration} ease-out, margin-left {durations.veryFastDuration} ease-out',
          // extend drop area down, otherwise the drop hover is blocked by the user's finger
          // must match toolbar marginBottom
          paddingBottom: isDraggingAny ? '7em' : 0,
        }),
      )}
      onMouseLeave={onMouseLeave}
      {...fastClick(tapUp, tapDown, undefined, touchMove)}
    >
      {
        // selected top dash
        selected && !dropToRemove ? (
          <div className={css({ height: 2, backgroundColor: 'highlight' })} style={{ width: fontSize }}></div>
        ) : null
      }

      {
        // drag-and-drop circle overlay
        (longPress.isPressed || isDragging) && !dropToRemove && (
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
          transition: 'opacity {durations.fastDuration} ease-out',
        })}
        style={style}
        animated={isAnimated}
        animationComplete={() => setIsAnimated(false)}
      />
    </div>
  )
}

export default ToolbarButton
