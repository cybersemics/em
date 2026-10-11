import { ComponentType, RefObject, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import CommandId from '../@types/CommandId'
import IconType from '../@types/IconType'
import { isTouch } from '../browser'
import { executeCommandWithMulticursor, formatKeyboardShortcut } from '../commands'
import useCommandState from '../hooks/useCommandState'
import haptics from '../util/haptics'
import FormattingBarIcon from './FormattingBarIcon'

/** The soft active light, drawn as a gradient because WebKit clips the design's blurred, blended disc. */
const ACTIVE_GLOW = `radial-gradient(closest-side, ${[30, 24.9, 14.6, 6, 0]
  .map(
    (alpha, i) => `color-mix(in srgb, ${token('colors.formattingBarHighlightGlow')} ${alpha}%, transparent) ${i * 25}%`,
  )
  .join(', ')})`

/** Maximum finger travel in pixels before a press is treated as a drag. */
const TAP_SLOP = 10

/** A fixed formatting command with its own appearance and focus-preserving press handling. */
const FormattingBarButton = ({
  commandId,
  iconSize,
  icon,
  buttonRef,
}: {
  commandId: CommandId
  iconSize: number
  /** Bare artwork, without the Toolbar's embedded picker. */
  icon?: ComponentType<IconType>
  /** The persistent button anchors a picker rendered beside the bar. */
  buttonRef?: RefObject<HTMLButtonElement | null>
}) => {
  const { command, formattingActive, active, executable, error } = useCommandState(commandId)
  const pickerOpen = useSelector(
    state => !!command.isDropdownOpen?.(state) && state.activeDropdown?.surface === 'formattingBar',
  )
  const selected = formattingActive ?? (command.isDropdownOpen ? pickerOpen : active)
  const Icon = icon ?? command.svg
  const [animated, setAnimated] = useState(false)
  const pressing = useRef(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  /** Runs one command without moving focus or letting a touch synthesize a second activation. */
  const activate = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    if (!executable) return
    haptics.light()
    executeCommandWithMulticursor(command, { type: 'formattingBar', event })
    setAnimated(!selected)
  }

  if (!Icon) return null

  return (
    <button
      ref={buttonRef}
      type='button'
      aria-label={command.label}
      aria-pressed={!!selected}
      aria-disabled={!executable}
      data-active={!!selected}
      title={`${command.label}${command.keyboard ? ` (${formatKeyboardShortcut(command.keyboard)})` : ''}${error ? '\nError: ' + error : ''}`}
      onMouseDown={event => {
        event.preventDefault()
        if (!isTouch && executable) haptics.medium()
      }}
      onClick={event => {
        event.preventDefault()
        if (!isTouch) activate(event)
      }}
      onTouchStart={event => {
        pressing.current = event.touches.length <= 1
        const touch = event.touches[0]
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
        if (executable) haptics.medium()
      }}
      // Manual touchend activation must reject drags while allowing small finger movements during a tap.
      onTouchMove={event => {
        const touch = event.touches[0]
        if (
          event.touches.length !== 1 ||
          (touch &&
            touchStart.current &&
            Math.hypot(touch.clientX - touchStart.current.x, touch.clientY - touchStart.current.y) > TAP_SLOP)
        )
          pressing.current = false
      }}
      onTouchCancel={() => {
        pressing.current = false
        touchStart.current = null
      }}
      onTouchEnd={event => {
        // Disabled and cancelled presses also retain the editable's focus.
        event.preventDefault()
        if (pressing.current) activate(event)
        pressing.current = false
        touchStart.current = null
      }}
      className={css({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minWidth: 0,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        pointerEvents: 'auto',
      })}
    >
      <span
        aria-hidden='true'
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
          background: ACTIVE_GLOW,
          opacity: selected ? 0.875 : 0,
        }}
      />
      <FormattingBarIcon
        Icon={Icon}
        size={iconSize}
        style={{ fill: token(error ? 'colors.red' : executable ? 'colors.formattingBarIcon' : 'colors.gray50') }}
        animated={animated}
        animationComplete={() => setAnimated(false)}
      />
    </button>
  )
}

export default FormattingBarButton
