import React, { PropsWithChildren } from 'react'
import { css } from '../../../styled-system/css'

/**
 * Content for dialog box.
 */
const DialogContent: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      className={css({
        fontSize: '1.25rem',
        color: 'fg',
        maxHeight: '70vh',
        overflow: 'auto',
        padding: '1rem',
        scrollbarColor: '{colors.fg} {colors.bg}',
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'bg',
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
