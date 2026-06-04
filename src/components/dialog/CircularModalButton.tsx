import React, { PropsWithChildren } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'

interface CircularModalButtonProps {
  onClick?: () => void
  ariaLabel: string
  disabled?: boolean
}

/**
 * Reusable circular modal-header button. Used four times in the Commands dialog header
 * (Back, Forward, Help, Close). Styling is owned by `dialogRecipe.headerButton`; the
 * caller supplies the icon as children.
 */
const CircularModalButton: React.FC<PropsWithChildren<CircularModalButtonProps>> = ({
  onClick,
  ariaLabel,
  disabled,
  children,
}) => {
  const dialog = dialogRecipe()
  return (
    <button type='button' onClick={onClick} aria-label={ariaLabel} disabled={disabled} className={dialog.headerButton}>
      {children}
    </button>
  )
}

export default CircularModalButton
