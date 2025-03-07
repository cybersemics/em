import React, { useEffect, useRef, useState } from 'react'
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
  const [isBottom, setIsBottom] = useState(false)

  useEffect(() => {
    const currentDialogRef = dialogRef.current // Capture the current ref value

    /**
     * Handles the click outside the dialog.
     */
    const handleClickOutside = (event: MouseEvent) => {
      if (currentDialogRef && !currentDialogRef.contains(event.target as Node)) {
        onClose()
      }
    }

    /**
     * When the user scrolls to the bottom, the gradient disappears.
     */
    const handleScroll = () => {
      if (currentDialogRef) {
        const { scrollTop, scrollHeight, clientHeight } = currentDialogRef
        const atBottom = scrollTop + clientHeight >= scrollHeight
        setIsBottom(atBottom)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    currentDialogRef?.addEventListener('scroll', handleScroll)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      currentDialogRef?.removeEventListener('scroll', handleScroll)
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
          padding: '0.8rem 0.8rem 0',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '80%',
          border: '2px solid {colors.fgOverlay50}',
          overflowY: 'auto',
          position: 'relative',
        })}
      >
        {children}
        {!isBottom && (
          <div
            className={css({
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '100px',
              background: 'linear-gradient(to top, {colors.bg} 0%, transparent 100%)',
              pointerEvents: 'none',
              transition: 'opacity 0.3s',
            })}
          />
        )}
      </div>
    </div>
  )
}

export default Dialog
