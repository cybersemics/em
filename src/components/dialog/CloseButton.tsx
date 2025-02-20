import React from 'react'
import { css } from '../../../styled-system/css'

interface CloseButtonProps {
  onClick: () => void
}

/**
 * Dialog close button.
 */
const CloseButton: React.FC<CloseButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className={css({
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '{colors.darkgray}',
        border: `2px solid {colors.gray50}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '{colors.fg}',
        transition: 'background-color 0.2s ease',
        backgroundImage: 'url("/assets/close.svg")',
        backgroundSize: '35%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        _hover: {
          backgroundColor: '{colors.bgOverlay50}',
        },
      })}
    ></button>
  )
}

export default CloseButton
