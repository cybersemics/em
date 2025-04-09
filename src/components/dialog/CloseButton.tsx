import React from 'react'
import { css } from '../../../styled-system/css'
import CloseIcon from '../icons/CloseIcon'

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
        minWidth: '40px',
        minHeight: '40px',
        borderRadius: '50%',
        marginRight: '0.5rem',
        backgroundColor: 'darkgray',
        border: `2px solid {colors.gray50}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background-color {durations.fast} ease-in-out',
        _hover: {
          backgroundColor: 'gray15',
        },
        padding: 0,
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <CloseIcon size={16} />
      </div>
    </button>
  )
}

export default CloseButton
