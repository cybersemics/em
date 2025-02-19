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
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#2E2A33',
        border: '2px solid #C9A2D1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#fff',
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
