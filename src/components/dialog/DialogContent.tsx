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
        justifyContent: 'center',
        fontSize: '1.25rem',
        color: '{colors.fg}',
        maxHeight: '70vh',
        overflow: 'auto',
        padding: '1rem',
        scrollbarColor: '{colors.fg} {colors.bg}',
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '{colors.bg}',
        },
        position: 'relative',
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
