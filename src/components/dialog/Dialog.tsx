import React, { useEffect, useRef, useState } from 'react'
import { css } from '../../../styled-system/css'
import { useBottomScrollListener } from 'react-bottom-scroll-listener'

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

  const setBottomRef = useBottomScrollListener<HTMLDivElement>(() => {
    setIsBottom(true)
  })

  useEffect(() => {
    const currentDialogRef = dialogRef.current

    /**
     * Handles the click outside the dialog.
     */
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
        backgroundColor: '{colors.bgOverlay50}',
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
          maxHeight: '80vh',
        })}
      >
        <div ref={setBottomRef} /> {/* this kind of works when wrap it around the div with ref dialogRef but messes up the placement */}
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
              display: 'block',
            })}
          />
        )}
      </div>
    </div>
  )
}

export default Dialog
