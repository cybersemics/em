import React from 'react'
import { css } from '../../../styled-system/css'

interface DialogContentProps {
  children: React.ReactNode
}

/**
 * Content for dialog box.
 */
const DialogContent: React.FC<DialogContentProps> = ({ children }) => {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontSize: '1.25rem',
        color: '{colors.fg}',
        marginBottom: '16px',
        '@media (min-width: 1200px)': {
          fontSize: '1.7rem',
        },
      })}
    >
      {children}
    </div>
  )
}

export default DialogContent
