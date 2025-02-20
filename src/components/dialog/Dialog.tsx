import React from 'react'
import { css } from '../../../styled-system/css'
import { useSelector } from 'react-redux'
import themeColors from '../../selectors/themeColors'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children }) => {
  const colors = useSelector(themeColors)

  if (!isOpen) return null

  return (
    <div
      className={css({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'modal',
      })}
    >
      <div
        className={css({
          backgroundColor: colors.bg,
          color: colors.fg,
          padding: '16px 20px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '80%',
          border: '2px solid rgba(189, 189, 189, 0.16)',
        })}
      >
        {children}
      </div>
    </div>
  )
}

export default Dialog
