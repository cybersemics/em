import React, { useEffect, useRef } from 'react'
import { css } from '../../../styled-system/css'

interface DialogProps {
  children: React.ReactNode
  onClose: () => void
}

/**
 * Dialog component.
 */
const Dialog: React.FC<DialogProps> = ({ children, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    /**
     * Handles the click outside the dialog.
     */
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    /**
     * Handles the click on the button outside the dialog.
     */
    const handleButtonClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'BUTTON') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('click', handleButtonClick)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('click', handleButtonClick)
    }
  }, [onClose])

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
        ref={dialogRef}
        className={css({
          backgroundColor: '{colors.bg}',
          color: '{colors.fg}',
          padding: '16px 20px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '80%',
          border: '2px solid {colors.fgOverlay50}',
        })}
      >
        {children}
      </div>
    </div>
  )
}

export default Dialog
