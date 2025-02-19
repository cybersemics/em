import React from 'react'
import { css } from '../../../styled-system/css'
import CloseButton from './CloseButton'

interface DialogTitleProps {
  children: React.ReactNode
  onClose: () => void
}

const DialogTitle: React.FC<DialogTitleProps> = ({ children, onClose }) => {
  return (
    <div
      className={css({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      })}
    >
      <h2
        className={css({
          fontWeight: '700',
          color: '#FFD6FC',
          borderBottom: 'none',
          fontSize: '1.5rem',
          marginBottom: '16px',
          marginTop: '16px',
        })}
      >
        {children}
      </h2>
      <CloseButton onClick={onClose} />
    </div>
  )
}

export default DialogTitle
