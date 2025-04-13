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
  const overlayRef = useRef<HTMLDivElement | null>(null)

  /**
   * Handles the click outside the dialog.
   */
  useEffect(() => {
    const currentDialogRef = dialogRef.current

    /** When the user clicks outside the dialog, close the dialog. */
    const handleClickOutside = (event: MouseEvent) => {
      if (currentDialogRef && !currentDialogRef.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  /**
   * On iOS, there was a bug where the user could scroll the page via the modal overlay.
   * It's difficult to disable scrolling entirely on iOS, so this effect prevents scrolling
   * on the modal overlay by preventing touch events.
   */
  useEffect(() => {
    const overlayElement = overlayRef.current
    const dialogElement = dialogRef.current

    if (!overlayElement || !dialogElement) return

    /** This event handler prevents touch events from propagating to the page. */
    const preventTouchMove = (e: TouchEvent) => {
      if (!dialogElement.contains(e.target as Node)) {
        // Only prevent scrolling if NOT inside dialog content
        e.preventDefault()
      }
    }

    overlayElement.addEventListener('touchmove', preventTouchMove, { passive: false })

    return () => {
      overlayElement.removeEventListener('touchmove', preventTouchMove)
    }
  }, [])

  return (
    <div
      ref={overlayRef}
      className={css({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'bgOverlay50',
        zIndex: 'modal',
        overflow: 'hidden',
      })}
    >
      <div
        ref={dialogRef}
        className={css({
          backgroundColor: 'bg',
          color: 'fg',
          padding: '0.8rem 0.8rem 0',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '80%',
          border: '2px solid {colors.fgOverlay50}',
          overflow: 'hidden',
          position: 'relative',
          maxHeight: '80vh',
        })}
      >
        {children}
        <div
          className={css({
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100px',
            background: 'linear-gradient(to top, {colors.bg} 0%, transparent 100%)',
            pointerEvents: 'none',
            display: 'block',
          })}
        />
      </div>
    </div>
  )
}

export default Dialog
