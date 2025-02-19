import React from 'react'
import { css } from '../../../styled-system/css'

interface CloseButtonProps {
  onClick: () => void
}

const CloseButton: React.FC<CloseButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className={css({
        padding: '8px',
        borderRadius: '50%',
        backgroundColor: 'transparent',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#C9A2D1',
        transition: 'background-color 0.2s ease',
        _hover: {
          backgroundColor: 'rgba(201, 162, 209, 0.2)',
        },
      })}
    >
     ✖
    </button>
  )
}

export default CloseButton
