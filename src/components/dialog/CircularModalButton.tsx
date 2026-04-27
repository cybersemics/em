import React, { PropsWithChildren } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'
import { useCommandUniverseDebug } from './CommandUniverseDebug'

interface CircularModalButtonProps {
  onClick?: () => void
  ariaLabel: string
  disabled?: boolean
}

/**
 * Reusable circular modal-header button. Used four times in the Commands dialog header
 * (Back, Forward, Help, Close). Styling is owned by `dialogRecipe.headerButton`; the
 * caller supplies the icon as children.
 *
 * Stroke and drop-shadow opacity are dialed via CSS custom properties so the debug
 * overlay can tune them live without re-emitting a Panda recipe variant.
 */
const CircularModalButton: React.FC<PropsWithChildren<CircularModalButtonProps>> = ({
  onClick,
  ariaLabel,
  disabled,
  children,
}) => {
  const dialog = dialogRecipe()
  const { state: debug } = useCommandUniverseDebug()
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={dialog.headerButton}
      style={
        {
          '--btn-stroke-opacity': debug.buttonStrokeOpacity,
          '--btn-shadow-opacity': debug.buttonShadowOpacity,
        } as React.CSSProperties
      }
    >
      {children}
    </button>
  )
}

export default CircularModalButton
