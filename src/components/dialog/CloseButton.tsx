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
        backgroundColor: '#221521',
        border: '2px solid #8d608c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#fff',
        transition: 'background-color 0.2s ease',
        backgroundImage: 'url("/assets/close.svg")',
        backgroundSize: '35%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        _hover: {
          backgroundColor: 'rgba(201, 162, 209, 0.2)',
        },
      })}
    >
    </button>
  )
}

export default CloseButton
