import React from 'react'
import { css } from '../../../styled-system/css'
import CloseButton from './CloseButton'

interface DialogTitleProps {
  children: React.ReactNode
  onClose: () => void
}

/**
 * Dialog title.
 */
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
          color: '{colors.fg}',
          borderBottom: 'none',
          fontSize: '1.5rem',
          margin: '16px',
          '@media (min-width: 1200px)': {
            fontSize: '2rem',
          },
        })}
      >
        {children}
      </h2>
      <CloseButton onClick={onClose} />
    </div>
  )
}

export default DialogTitle
