import React from 'react'
import { css } from '../../../styled-system/css'

interface DialogContentProps {
  children: React.ReactNode
}

const DialogContent: React.FC<DialogContentProps> = ({ children }) => {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontSize: '1.125rem',
        marginBottom: '16px',
      })}
    >
      {children}
    </div>
  )
}

export default DialogContent
