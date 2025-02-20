import React from 'react'
import { css } from '../../../styled-system/css'
import { useSelector } from 'react-redux'
import themeColors from '../../selectors/themeColors'

interface DialogContentProps {
  children: React.ReactNode
}

const DialogContent: React.FC<DialogContentProps> = ({ children }) => {
  const colors = useSelector(themeColors)

  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontSize: '1.25rem',
        color: colors.fg,
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
